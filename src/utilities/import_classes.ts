import { startDialog } from "~src/canvas/dialog";
import { getBaseApiUrl } from "~src/canvas/settings";

function dayCheckbox(id: string, label: string) {
    return `<label style="margin-right:.5em"><input type="checkbox" id="${id}" class="cwu-day"> ${label}</label>`;
}

const MANAGE_DIALOG_HTML = `
  <div id="cwu-manage-classes" style="padding:8px">
    <div id="cwu-courses-step" style="margin-bottom:12px">
      <strong>Select course</strong>
      <div id="cwu-courses-list" style="margin-top:4px">Loading courses…</div>
    </div>
    <div style="margin-bottom:16px">
      <button id="cwu-mode-import" class="btn btn-primary active" data-mode="import">Schedule Times</button>
      <button id="cwu-mode-remove" class="btn btn-default" data-mode="remove" style="margin-left:6px">Remove Courses</button>
    </div>

    <!-- IMPORT MODE -->
    <div id="cwu-import-mode" class="cwu-mode-section">
      <div id="cwu-import-alert" class="alert alert-info" style="display:none"></div>
      <hr/>
      <div class="row" style="margin-bottom:8px">
        <div class="col-md-12">
          <strong>Pattern</strong><br/>
          <label style="margin-right:1em"><input type="radio" name="cwu-pattern" value="mwf" checked> Mon/Wed/Fri (55 min)</label>
          <label style="margin-right:1em"><input type="radio" name="cwu-pattern" value="tuth"> Tue/Thu (80 min)</label>
          <label><input type="radio" name="cwu-pattern" value="custom"> Custom</label>
        </div>
      </div>
      <div class="row" style="margin-bottom:8px">
        <div class="col-md-12">
          <strong>Days</strong><br/>
          ${dayCheckbox('cwu-mon','Mon')}
          ${dayCheckbox('cwu-tue','Tue')}
          ${dayCheckbox('cwu-wed','Wed')}
          ${dayCheckbox('cwu-thu','Thu')}
          ${dayCheckbox('cwu-fri','Fri')}
          ${dayCheckbox('cwu-sat','Sat')}
          ${dayCheckbox('cwu-sun','Sun')}
        </div>
      </div>
      <div class="row" style="margin-bottom:8px">
        <div class="col-md-4">
          <label><strong>Start time</strong><br/>
            <input type="time" id="cwu-start-time" class="form-control" value="09:00">
          </label>
        </div>
        <div class="col-md-4">
          <label><strong>Duration (minutes)</strong><br/>
            <input type="number" id="cwu-duration" class="form-control" min="15" step="5" value="55">
          </label>
        </div>
        <div class="col-md-4">
          <label><strong>Location (optional)</strong><br/>
            <input type="text" id="cwu-location" class="form-control" placeholder="e.g. Smith 201">
          </label>
        </div>
      </div>
      <div class="row" style="margin-bottom:8px">
        <div class="col-md-4">
          <label><strong>Start date</strong><br/>
            <input type="date" id="cwu-start-date" class="form-control">
          </label>
        </div>
        <div class="col-md-4">
          <label><strong>End date</strong><br/>
            <input type="date" id="cwu-end-date" class="form-control">
          </label>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <div class="col-md-12">
          <button id="cwu-create-events" class="btn btn-success">Create events</button>
        </div>
      </div>
      <div id="cwu-create-result" style="margin-top:8px; display:none"></div>
    </div>

    <!-- REMOVE MODE -->
    <div id="cwu-remove-mode" class="cwu-mode-section" style="display:none">
      <div id="cwu-remove-alert" class="alert alert-info" style="display:none"></div>
      <div style="margin-top:8px">
        <button id="cwu-remove-events" class="btn btn-danger">Remove Courses</button>
      </div>
      <div id="cwu-remove-result" style="margin-top:8px; display:none"></div>
    </div>
  </div>
`;

function setPatternDefaults(pattern: 'mwf'|'tuth'|'custom') {
  const $ = window as any as { jQuery: any };
  const jq = (window as any).jQuery || (window as any).$;
  const check = (id: string, on: boolean) => jq(`#${id}`).prop('checked', on);
  if (pattern === 'mwf') {
    check('cwu-mon', true); check('cwu-wed', true); check('cwu-fri', true);
    check('cwu-tue', false); check('cwu-thu', false); check('cwu-sat', false); check('cwu-sun', false);
    jq('#cwu-duration').val(55);
  } else if (pattern === 'tuth') {
    check('cwu-mon', false); check('cwu-wed', false); check('cwu-fri', false);
    check('cwu-tue', true); check('cwu-thu', true); check('cwu-sat', false); check('cwu-sun', false);
    jq('#cwu-duration').val(80);
  }
}

function initDefaults() {
  const jq = (window as any).jQuery || (window as any).$;
  // Default dates: start = next Monday; end = start + 12 weeks (placeholder; user can change)
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const deltaToMon = (8 - (day === 0 ? 7 : day)) % 7; // days to next Mon (0 if today Mon)
  const start = new Date(today);
  start.setDate(start.getDate() + deltaToMon);
  const end = new Date(start);
  end.setDate(end.getDate() + 84);
  const toYMD = (d: Date) => d.toISOString().slice(0,10);
  jq('#cwu-start-date').val(toYMD(start));
  jq('#cwu-end-date').val(toYMD(end));
  setPatternDefaults('mwf');
}

export function openManageClassesDialog() {
  const dlg = startDialog('Manage Courses', MANAGE_DIALOG_HTML);
  const jq = (window as any).jQuery || (window as any).$;
  initDefaults();
  loadCoursesList();

  // Mode switcher
  jq('#cwu-mode-import').on('click', function(this: HTMLButtonElement) {
    jq('.cwu-mode-section').hide();
    jq('#cwu-import-mode').show();
    jq('#cwu-mode-import, #cwu-mode-remove').removeClass('active').addClass('btn-default').removeClass('btn-primary').removeClass('btn-danger');
    jq(this).addClass('active').addClass('btn-primary').removeClass('btn-default');
  });

  jq('#cwu-mode-remove').on('click', function(this: HTMLButtonElement) {
    jq('.cwu-mode-section').hide();
    jq('#cwu-remove-mode').show();
    jq('#cwu-mode-import, #cwu-mode-remove').removeClass('active').addClass('btn-default').removeClass('btn-primary').removeClass('btn-danger');
    jq(this).addClass('active').addClass('btn-danger').removeClass('btn-default');
  });

  jq('input[name="cwu-pattern"]').on('change', function(this: HTMLInputElement){
    setPatternDefaults(this.value as any);
  });

  jq('#cwu-create-events').on('click', () => {
    createEventsForSelection();
  });

  jq('#cwu-remove-events').on('click', () => {
    removeEventsForSelection();
  });
}

type CourseLite = { id: number; name: string; course_code?: string };
let COURSE_INDEX: Record<number, CourseLite> = {};

async function fetchStudentCourses(): Promise<CourseLite[]> {
  return new Promise((resolve, reject) => {
    const url = getBaseApiUrl() + 'courses';
    $.getJSON(url, {
      enrollment_state: 'active',
      enrollment_type: 'student',
      include: ['term']
    }).done((data) => {
      const courses = (data || []).map((c: any) => ({ id: c.id, name: c.name, course_code: c.course_code }));
      resolve(courses);
    }).fail((jq, s, e) => reject(e || s));
  });
}

async function fetchAllCalendarEvents(): Promise<Array<{id: string; title: string; start: string}>> {
  return new Promise((resolve, reject) => {
    const jq = (window as any).jQuery || (window as any).$;
    const baseUrl = getBaseApiUrl();
    const url = baseUrl + 'calendar_events';
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, 0, 1);
    const endDate = new Date(now.getFullYear() + 1, 11, 31);
    const params = {
      'per_page': 500,
      'start_date': startDate.toISOString().split('T')[0],
      'end_date': endDate.toISOString().split('T')[0],
      'context_codes[]': `user_${(window as any).ENV?.current_user?.id || 'self'}`
    };
    console.log('=== FETCH ALL EVENTS ===');
    console.log('Base API URL:', baseUrl);
    console.log('Full URL:', url);
    console.log('Params:', params);
    jq.getJSON(url, params).done((data: any) => {
      console.log('Raw API response type:', typeof data);
      console.log('Raw API response:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Length:', data ? data.length : 'null/undefined');
      if (data && data.length > 0) {
        console.log('First event:', data[0]);
      }
      const events = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        start: e.start_at
      }));
      console.log('Mapped events:', events);
      resolve(events);
    }).fail((xhr: any) => {
      console.error('=== FETCH FAILED ===');
      console.error('Status:', xhr.status);
      console.error('Response text:', xhr.responseText);
      reject(new Error('Failed to fetch events'));
    });
  });
}

function loadCoursesList() {
  const jq = (window as any).jQuery || (window as any).$;
  const container = jq('#cwu-courses-list');
  container.text('Loading courses…');
  fetchStudentCourses().then((courses) => {
    if (!courses.length) {
      container.html('<div class="alert alert-warning">No active courses found.</div>');
      return;
    }
    COURSE_INDEX = Object.fromEntries(courses.map(c => [c.id, c]));
    const html = [
      '<div class="form-group">',
      '<div style="max-height: 200px; overflow:auto; border:1px solid #ddd; padding:6px; margin-top:0">',
      ...courses.map(c => `<div><label><input type="radio" name="cwu-course" class="cwu-course" data-id="${c.id}"> [${c.course_code || c.id}] ${c.name}</label></div>`),
      '</div></div>'
    ].join('');
    container.html(html);
    jq('#cwu-create-events').prop('disabled', false).text('Create events');
  }).catch(() => {
    container.html('<div class="alert alert-danger">Failed to load courses.</div>');
  });
}

function loadRemoveCoursesList() {
  const jq = (window as any).jQuery || (window as any).$;
  const container = jq('#cwu-remove-courses-list');
  container.text('Loading courses…');
  fetchStudentCourses().then((courses) => {
    if (!courses.length) {
      container.html('<div class="alert alert-warning">No active courses found.</div>');
      return;
    }
    COURSE_INDEX = Object.fromEntries(courses.map(c => [c.id, c]));
    const html = [
      '<div class="form-group">',
      '<div style="max-height: 200px; overflow:auto; border:1px solid #ddd; padding:6px; margin-top:0">',
      ...courses.map(c => `<div><label><input type="checkbox" class="cwu-remove-course" data-id="${c.id}"> [${c.course_code || c.id}] ${c.name}</label></div>`),
      '</div></div>'
    ].join('');
    container.html(html);
    jq('#cwu-remove-events').prop('disabled', false).text('Remove Courses');
  }).catch(() => {
    container.html('<div class="alert alert-danger">Failed to load courses.</div>');
  });
}

function toISO(dateYMD: string, timeHM: string): string {
  const [y,m,d] = dateYMD.split('-').map(Number);
  const [hh,mm] = timeHM.split(':').map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  return dt.toISOString();
}

function endISOFromStart(startYMD: string, timeHM: string, durationMin: number): string {
  const [y,m,d] = startYMD.split('-').map(Number);
  const [hh,mm] = timeHM.split(':').map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + durationMin);
  return dt.toISOString();
}

function untilZ(endYMD: string): string {
  // 23:59:59Z on end date
  const [y,m,d] = endYMD.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d, 23, 59, 59));
  const pad = (n: number) => n.toString().padStart(2,'0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T235959Z`;
}

function selectedByDays(): string[] {
  const jq = (window as any).jQuery || (window as any).$;
  const map: Record<string,string> = { 'cwu-mon':'MO','cwu-tue':'TU','cwu-wed':'WE','cwu-thu':'TH','cwu-fri':'FR','cwu-sat':'SA','cwu-sun':'SU' };
  return Object.keys(map).filter(id => jq(`#${id}`).prop('checked')).map(id => map[id]);
}

async function createEventsForSelection() {
  const jq = (window as any).jQuery || (window as any).$;
  const startDate = (jq('#cwu-start-date').val() as string) || '';
  const endDate = (jq('#cwu-end-date').val() as string) || '';
  const startTime = (jq('#cwu-start-time').val() as string) || '09:00';
  const duration = parseInt(jq('#cwu-duration').val() as any, 10) || 55;
  const location = (jq('#cwu-location').val() as string) || '';
  const days = selectedByDays();
  if (!startDate || !endDate || !days.length) {
    jq('#cwu-create-result').html('<div class="alert alert-warning">Please select at least one day and set start/end dates.</div>').show();
    return;
  }
  const rrule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${days.join(',')};UNTIL=${untilZ(endDate)}`;
  const start_at = toISO(startDate, startTime);
  const end_at = endISOFromStart(startDate, startTime, duration);

  const ids = $('.cwu-course:checked').map((i,el)=>Number($(el).data('id'))).get();
  if (!ids.length) {
    jq('#cwu-create-result').html('<div class="alert alert-warning">Please select at least one course.</div>').show();
    return;
  }

  jq('#cwu-create-events').prop('disabled', true);
  jq('#cwu-create-result').html('<div class="alert alert-info">Creating events…</div>').show();

  const url = getBaseApiUrl() + 'calendar_events';
  const ctxCode = (() => {
    try { return `user_${(window as any).ENV.current_user.id}`; } catch { return 'user_self'; }
  })();
  const getCsrf = () => {
    const byMeta = [
      'meta[name="csrf-token"]',
      'meta[name="_csrf_token"]',
      'meta[name="csrf-param"]'
    ];
    for (const selector of byMeta) {
      const meta = document.querySelector(selector) as HTMLMetaElement | null;
      if (meta?.content) return meta.content;
    }

    const env = (window as any).ENV || {};
    if (typeof env.csrf_token === 'string' && env.csrf_token) return env.csrf_token;
    if (typeof env.CSRF_TOKEN === 'string' && env.CSRF_TOKEN) return env.CSRF_TOKEN;

    const rawCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('_csrf_token='));
    if (rawCookie) {
      const token = rawCookie.substring('_csrf_token='.length);
      try {
        return decodeURIComponent(token);
      } catch {
        return token;
      }
    }

    return '';
  };

  const postCalendarEvent = (data: any) => {
    const csrf = getCsrf();
    const headers: Record<string, string> = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const payload = csrf ? { authenticity_token: csrf, ...data } : data;
    return $.ajax({
      url,
      method: 'POST',
      headers,
      data: payload
    });
  };

  const tz = (() => (Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'))();

  const createSeries = (courseId: number) => new Promise<{ok: boolean, status?: number, message?: string}>((resolve) => {
    const meta = COURSE_INDEX[courseId];
    const prefix = meta?.course_code ? `[${meta.course_code}]` : `[${courseId}]`;
    const payloadWithCtx: any = {
      'calendar_event[context_code]': ctxCode,
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadNoCtx: any = {
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadAltCtx: any = {
      'calendar_event[context_type]': 'User',
      'calendar_event[context_id]': (window as any).ENV?.current_user?.id,
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    postCalendarEvent(payloadWithCtx).done(() => resolve({ok:true}))
      .fail((jqXHR) => {
        if (jqXHR.status === 422) {
          // Retry without context_code; Canvas will default to personal calendar
          postCalendarEvent(payloadNoCtx)
            .done(() => resolve({ok:true}))
            .fail((jq2) => {
              if (jq2.status === 422) {
                // Final retry with context_type/context_id
                postCalendarEvent(payloadAltCtx)
                  .done(() => resolve({ok:true}))
                  .fail((jq3) => {
                    console.warn('Calendar event create failed (alt ctx)', jq3.status, jq3.responseText);
                    resolve({ok:false, status: jq3.status, message: jq3.responseText});
                  });
              } else {
                console.warn('Calendar event create failed (no ctx)', jq2.status, jq2.responseText);
                resolve({ok:false, status: jq2.status, message: jq2.responseText});
              }
            });
        } else {
          console.warn('Calendar event create failed', jqXHR.status, jqXHR.responseText);
          resolve({ok:false, status: jqXHR.status, message: jqXHR.responseText});
        }
      });
  });

  const createSingle = (courseId: number, ymd: string) => new Promise<{ok: boolean}>((resolve) => {
    const meta = COURSE_INDEX[courseId];
    const prefix = meta?.course_code ? `[${meta.course_code}]` : `[${courseId}]`;
    const payloadWithCtx: any = {
      'calendar_event[context_code]': ctxCode,
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadNoCtx: any = {
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadAltCtx: any = {
      'calendar_event[context_type]': 'User',
      'calendar_event[context_id]': (window as any).ENV?.current_user?.id,
      'calendar_event[title]': `${prefix} Course`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    postCalendarEvent(payloadWithCtx).done(() => resolve({ok:true}))
      .fail((jqXHR) => {
        if (jqXHR.status === 422) {
          postCalendarEvent(payloadNoCtx)
            .done(() => resolve({ok:true}))
            .fail((jq2) => {
              if (jq2.status === 422) {
                postCalendarEvent(payloadAltCtx)
                  .done(() => resolve({ok:true}))
                  .fail(() => resolve({ok:false}));
              } else {
                resolve({ok:false});
              }
            });
        } else {
          resolve({ok:false});
        }
      });
  });

  let seriesFailed = 0;
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const res = await createSeries(id);
    if (!res.ok) seriesFailed++;
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 120));
  }

  if (seriesFailed === 0) {
    jq('#cwu-create-result').html('<div class="alert alert-success">✓ Recurring events created successfully!</div>').show();
  } else {
    jq('#cwu-create-result').html('<div class="alert alert-warning">Could not create recurring series. Falling back to individual events…</div>').show();

    const dayMap: Record<string, number> = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
    const wanted = new Set(days.map(d => dayMap[d]));
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (wanted.has(d.getDay())) {
        dates.push(d.toISOString().slice(0,10));
      }
    }

    let failedSingles = 0;
    for (const id of ids) {
      for (const ymd of dates) {
        const ok = await createSingle(id, ymd);
        if (!ok.ok) failedSingles++;
        await new Promise(r => setTimeout(r, 80));
      }
    }
    if (failedSingles === 0) {
      jq('#cwu-create-result').html('<div class="alert alert-success">✓ Events created as individual occurrences!</div>').show();
    } else {
      jq('#cwu-create-result').html(`<div class="alert alert-warning">⚠ ${failedSingles} events failed to create. Check console for details.</div>`).show();
    }
  }

  try { (window as any).jQuery('.calendar.fc').fullCalendar('refetchEvents'); } catch {}
}

async function removeEventsForSelection() {
  const jq = (window as any).jQuery || (window as any).$;
  
  const ids = jq('.cwu-course:checked').map((i: number, el: any) => Number(jq(el).data('id'))).get();
  if (!ids.length) {
    jq('#cwu-remove-result').html('<div class="alert alert-warning">Please select at least one course.</div>').show();
    return;
  }

  jq('#cwu-remove-events').prop('disabled', true);
  jq('#cwu-remove-result').html('<div class="alert alert-info">Finding and removing course events…</div>').show();

  try {
    // Fetch all calendar events for the user
    const events = await fetchAllCalendarEvents();
    console.log('Fetched events:', events);
    
    // Build a set of course codes for selected courses
    const courseCodes = new Set<string>();
    for (const id of ids) {
      const meta = COURSE_INDEX[id];
      if (meta?.course_code) {
        courseCodes.add(meta.course_code);
      } else {
        // Fallback: use numeric ID as string
        courseCodes.add(String(id));
      }
    }
    console.log('Looking for course codes:', Array.from(courseCodes));
    
    // Filter for events matching "[courseCode] Class" for selected courses
    const eventsToDelete = events.filter(e => {
      const match = /^\[(.+?)\]\s+Course$/.exec(e.title);
      if (!match) {
        console.log('Title does not match pattern:', e.title);
        return false;
      }
      const courseCode = match[1];
      const isSelected = courseCodes.has(courseCode);
      if (isSelected) {
        console.log('Found class event to delete:', e.title, 'courseCode:', courseCode);
      }
      return isSelected;
    });
    
    console.log('Events to delete:', eventsToDelete);

    if (!eventsToDelete.length) {
      jq('#cwu-remove-result').html('<div class="alert alert-info">No course events found for selected courses. Check browser console for event titles.</div>').show();
      jq('#cwu-remove-events').prop('disabled', false);
      return;
    }

    // Delete all found events
    let deleted = 0;
    for (const evt of eventsToDelete) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await deleteCalendarEvent(evt.id);
      if (ok) deleted++;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 80));
    }

    jq('#cwu-remove-result').html(`<div class="alert alert-success">✓ Removed ${deleted} / ${eventsToDelete.length} course events!</div>`).show();
    jq('#cwu-remove-events').text('Done').prop('disabled', true);

    try { (window as any).jQuery('.calendar.fc').fullCalendar('refetchEvents'); } catch {}
  } catch (err) {
    jq('#cwu-remove-result').html('<div class="alert alert-danger">Error removing events. Check console.</div>').show();
    jq('#cwu-remove-events').prop('disabled', false);
    console.error('Remove events error:', err);
  }
}

async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const jq = (window as any).jQuery || (window as any).$;
    const url = getBaseApiUrl() + `calendar_events/${eventId}`;
    const csrf = (() => {
      const byMeta = [
        'meta[name="csrf-token"]',
        'meta[name="_csrf_token"]',
        'meta[name="csrf-param"]'
      ];
      for (const selector of byMeta) {
        const meta = document.querySelector(selector) as HTMLMetaElement | null;
        if (meta?.content) return meta.content;
      }
      const env = (window as any).ENV || {};
      if (typeof env.csrf_token === 'string' && env.csrf_token) return env.csrf_token;
      if (typeof env.CSRF_TOKEN === 'string' && env.CSRF_TOKEN) return env.CSRF_TOKEN;
      const rawCookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('_csrf_token='));
      if (rawCookie) {
        const token = rawCookie.substring('_csrf_token='.length);
        try {
          return decodeURIComponent(token);
        } catch {
          return token;
        }
      }
      return '';
    })();
    const headers: Record<string, string> = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    jq.ajax({
      url,
      method: 'DELETE',
      headers
    }).done(() => resolve(true))
      .fail(() => resolve(false));
  });
}
