export type TimeSpecTuple = [number, number, number];
export type TimeSpec = string | TimeSpecTuple;

export function tzOffset(offset: string) {
  const n = offset.slice(1, 5);
  const [h, m] =
    n.length >= 3 ? [n.slice(0, -2), n.slice(-2)] : [n, '0'];

  const vala = parseInt(h, 10);
  const valb = parseInt(m, 10);
  const minutes = vala*60 + valb;

  return offset[0] === '+' ? minutes : -minutes;
}

export function parseTimeSpec(timeSpec?: TimeSpec): TimeSpecTuple {
  if (!timeSpec)
    return [10, 0, -300];

  if (Array.isArray(timeSpec))
    return timeSpec;

  const m = timeSpec.match(/^(\d{1,2})(:(\d\d))?([+-]\d{4})?$/);

  if (!m) {
    throw new Error(`Couldn't parse timeSpec option: ${timeSpec}`);
  }

  return [parseInt(m[1]), m[3] ? parseInt(m[3]) : 0, m[4] ? tzOffset(m[4]) : -300];
}

export function setTime(date: string | number | Date, time?: TimeSpec) {
  if (!time)
    return new Date(date);

  let [h, m, tz] = parseTimeSpec(time);
  const d = new Date(date);
  tz += d.getTimezoneOffset();

  return new Date((d.setHours(h, m, 0, 0)) - (tz*60000));
}


function test() {
  const specs = [undefined, '12:00', '9:00-0600'];
  for (const specString of specs) {
    const spec = parseTimeSpec(specString);
    console.log(spec);

    const sendAt = setTime(new Date(), spec);
    console.log(sendAt);
  }
}

if (require.main === module)
  test();
