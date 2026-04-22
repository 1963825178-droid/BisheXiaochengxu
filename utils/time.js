function padNumber(value) {
  return String(value).padStart(2, '0');
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? cloneDate(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-');
}

function formatDate(date) {
  return (
    String(date.getFullYear()) +
    '\u5e74' +
    String(date.getMonth() + 1) +
    '\u6708' +
    String(date.getDate()) +
    '\u65e5'
  );
}

function formatTime(date) {
  return padNumber(date.getHours()) + ':' + padNumber(date.getMinutes());
}

function formatDateTime(date) {
  return formatDate(date) + ' ' + formatTime(date);
}

function formatDateTimeValue(value) {
  const date = toDate(value);
  return date ? formatDateTime(date) : '';
}

function formatMonthLabel(year, month) {
  return String(year) + '\u5e74' + String(month) + '\u6708';
}

function isSameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

module.exports = {
  cloneDate,
  formatDate,
  formatDateKey,
  formatDateTime,
  formatDateTimeValue,
  formatMonthLabel,
  formatTime,
  isSameMonth,
  padNumber,
  toDate
};
