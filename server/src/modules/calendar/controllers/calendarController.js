const CalendarEvent = require('../models/CalendarEvent');
const GoogleCalendarConnection = require('../models/GoogleCalendarConnection');
const { AppError } = require('../../../shared/middleware/errorHandler');
const crypto = require('crypto');

const isPrivileged = (role) => ['super_admin', 'admin'].includes(role);

const canAccessEvent = (event, user) => {
  if (isPrivileged(user.role)) return true;
  if (event.visibility === 'team') return true;
  if (String(event.createdBy) === String(user._id)) return true;
  return event.participants?.some((p) => String(p) === String(user._id));
};

const canEditEvent = (event, user) => {
  if (isPrivileged(user.role)) return true;
  return String(event.createdBy) === String(user._id);
};

const buildWindow = (query) => {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from, to };
};

const getOAuthConfig = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError('Google OAuth is not configured on the server', 500);
  }
  return { clientId, clientSecret, redirectUri };
};

const getFrontendCalendarUrl = (state) => {
  const base = process.env.CLIENT_URL || 'http://localhost:3000';
  const qp = new URLSearchParams(state).toString();
  return `${base}/dashboard/calendar${qp ? `?${qp}` : ''}`;
};

const createState = (userId) => {
  const payloadObject = {
    userId: String(userId),
    ts: Date.now(),
  };
  const payload = JSON.stringify(payloadObject);
  const secret = process.env.JWT_ACCESS_SECRET || 'state-secret';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload: payloadObject, sig })).toString('base64url');
};

const parseState = (encoded) => {
  try {
    const raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const payloadString = JSON.stringify(raw.payload);
    const secret = process.env.JWT_ACCESS_SECRET || 'state-secret';
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    if (raw.sig !== expectedSig) throw new Error('Invalid signature');
    if (!raw.payload?.ts || Date.now() - raw.payload.ts > 15 * 60 * 1000) {
      throw new Error('Expired state');
    }
    return raw.payload;
  } catch {
    throw new AppError('Invalid OAuth state', 400);
  }
};

const exchangeCodeForTokens = async ({ code, clientId, clientSecret, redirectUri }) => {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new AppError('Failed to exchange Google authorization code', 400);
  return response.json();
};

const refreshAccessToken = async (refreshToken, { clientId, clientSecret }) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new AppError('Failed to refresh Google access token', 401);
  return response.json();
};

const getGooglePrimaryCalendar = async (accessToken) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return response.json();
};

const ensureFreshAccessToken = async (connection) => {
  const oauthConfig = getOAuthConfig();
  const isExpired = !connection.expiryDate || connection.expiryDate.getTime() - Date.now() < 60 * 1000;
  if (!isExpired) return connection.accessToken;
  if (!connection.refreshToken) throw new AppError('Missing Google refresh token. Please reconnect Google Calendar.', 401);

  const refreshed = await refreshAccessToken(connection.refreshToken, oauthConfig);
  connection.accessToken = refreshed.access_token;
  connection.tokenType = refreshed.token_type || connection.tokenType;
  connection.scope = refreshed.scope || connection.scope;
  connection.expiryDate = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000);
  await connection.save({ validateBeforeSave: false });

  return connection.accessToken;
};

exports.listEvents = async (req, res, next) => {
  try {
    const { from, to } = buildWindow(req.query);
    const filters = {
      startAt: { $lt: to },
      endAt: { $gte: from },
    };

    if (!isPrivileged(req.user.role)) {
      filters.$or = [
        { visibility: 'team' },
        { createdBy: req.user._id },
        { participants: req.user._id },
      ];
    }

    const events = await CalendarEvent.find(filters)
      .populate('participants', 'name email profileImage')
      .populate('createdBy', 'name email')
      .sort({ startAt: 1 });

    res.json({ status: 'success', data: { events, from, to } });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const payload = req.validated;
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    if (endAt <= startAt) return next(new AppError('End time must be after start time', 400));

    const event = await CalendarEvent.create({
      ...payload,
      startAt,
      endAt,
      createdBy: req.user._id,
      source: 'manual',
    });

    const full = await CalendarEvent.findById(event._id)
      .populate('participants', 'name email profileImage')
      .populate('createdBy', 'name email');

    res.status(201).json({ status: 'success', data: { event: full } });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) return next(new AppError('Calendar event not found', 404));
    if (!canEditEvent(event, req.user)) return next(new AppError('Not allowed to update this event', 403));

    const payload = req.validated;
    Object.assign(event, payload);
    if (payload.startAt) event.startAt = new Date(payload.startAt);
    if (payload.endAt) event.endAt = new Date(payload.endAt);
    if (event.endAt <= event.startAt) return next(new AppError('End time must be after start time', 400));

    await event.save();

    const full = await CalendarEvent.findById(event._id)
      .populate('participants', 'name email profileImage')
      .populate('createdBy', 'name email');

    res.json({ status: 'success', data: { event: full } });
  } catch (err) {
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) return next(new AppError('Calendar event not found', 404));
    if (!canEditEvent(event, req.user)) return next(new AppError('Not allowed to delete this event', 403));

    await event.deleteOne();
    res.json({ status: 'success', message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
      .populate('participants', 'name email profileImage')
      .populate('createdBy', 'name email');
    if (!event) return next(new AppError('Calendar event not found', 404));
    if (!canAccessEvent(event, req.user)) return next(new AppError('Not allowed to access this event', 403));

    res.json({ status: 'success', data: { event } });
  } catch (err) {
    next(err);
  }
};

exports.syncGoogleCalendar = async (req, res, next) => {
  try {
    const { calendarId, from, to } = req.validated;
    const windowFrom = from ? new Date(from) : new Date();
    const windowTo = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const connection = await GoogleCalendarConnection.findOne({ user: req.user._id })
      .select('+accessToken +refreshToken');
    if (!connection) return next(new AppError('Google Calendar is not connected. Connect first.', 400));
    const accessToken = await ensureFreshAccessToken(connection);

    const eventFilter = {
      startAt: { $gte: windowFrom, $lte: windowTo },
      $or: [
        { visibility: 'team' },
        { createdBy: req.user._id },
        { participants: req.user._id },
      ],
    };

    const events = await CalendarEvent.find(eventFilter).sort({ startAt: 1 });

    const endpointBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const endpoint = `${endpointBase}?conferenceDataVersion=1`;
    let syncedCount = 0;
    const errors = [];

    for (const event of events) {
      const payload = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: event.isAllDay
          ? { date: event.startAt.toISOString().slice(0, 10) }
          : { dateTime: event.startAt.toISOString() },
        end: event.isAllDay
          ? { date: event.endAt.toISOString().slice(0, 10) }
          : { dateTime: event.endAt.toISOString() },
        extendedProperties: {
          private: {
            source: 'nowazone',
            sourceEventId: String(event._id),
          },
        },
        conferenceData: {
          createRequest: {
            requestId: `nowazone-${event._id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        errors.push({ eventId: String(event._id), reason: body.slice(0, 300) });
        continue;
      }

      const created = await response.json();
      event.googleEventId = created.id || event.googleEventId;
      event.source = 'google';
      const meetLink =
        created.hangoutLink ||
        created.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
        '';
      if (meetLink) {
        event.meetingUrl = meetLink;
        if (!event.location) {
          event.location = meetLink;
        }
      }
      await event.save({ validateBeforeSave: false });
      syncedCount += 1;
    }

    res.json({
      status: 'success',
      data: {
        syncedCount,
        total: events.length,
        failed: errors.length,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getGoogleAuthUrl = async (req, res, next) => {
  try {
    const { clientId, redirectUri } = getOAuthConfig();
    const state = createState(req.user._id);
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });

    res.json({
      status: 'success',
      data: { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` },
    });
  } catch (err) {
    next(err);
  }
};

exports.googleOAuthCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(getFrontendCalendarUrl({ google: 'error', reason: String(error) }));
    }
    if (!code || !state) {
      return res.redirect(getFrontendCalendarUrl({ google: 'error', reason: 'missing_code_or_state' }));
    }

    const parsed = parseState(String(state));
    if (!parsed?.userId) {
      return res.redirect(getFrontendCalendarUrl({ google: 'error', reason: 'invalid_state' }));
    }

    const oauthConfig = getOAuthConfig();
    const tokens = await exchangeCodeForTokens({
      code: String(code),
      clientId: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      redirectUri: oauthConfig.redirectUri,
    });

    const accessToken = tokens.access_token;
    if (!accessToken) {
      return res.redirect(getFrontendCalendarUrl({ google: 'error', reason: 'no_access_token' }));
    }

    const primary = await getGooglePrimaryCalendar(accessToken);
    const googleEmail = primary?.accessRole ? primary?.id : undefined;

    await GoogleCalendarConnection.findOneAndUpdate(
      { user: parsed.userId },
      {
        user: parsed.userId,
        googleEmail,
        accessToken,
        refreshToken: tokens.refresh_token,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        expiryDate: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect(getFrontendCalendarUrl({ google: 'connected' }));
  } catch (err) {
    next(err);
  }
};

exports.getGoogleConnectionStatus = async (req, res, next) => {
  try {
    const connection = await GoogleCalendarConnection.findOne({ user: req.user._id })
      .select('googleEmail expiryDate updatedAt');
    res.json({
      status: 'success',
      data: {
        connected: Boolean(connection),
        account: connection?.googleEmail || null,
        expiryDate: connection?.expiryDate || null,
        updatedAt: connection?.updatedAt || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.disconnectGoogleCalendar = async (req, res, next) => {
  try {
    await GoogleCalendarConnection.findOneAndDelete({ user: req.user._id });
    res.json({ status: 'success', message: 'Google Calendar disconnected' });
  } catch (err) {
    next(err);
  }
};
