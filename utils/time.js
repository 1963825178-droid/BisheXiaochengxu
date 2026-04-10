function padNumber(value) {
  return String(value).padStart(2, '0');
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-');
}

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTime(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

function formatMonthLabel(year, month) {
  return `${year}年${month}月`;
}

function isSameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

module.exports = {
  cloneDate,
  formatDate,
  formatDateKey,
  formatDateTime,
  formatMonthLabel,
  formatTime,
  isSameMonth,
  padNumber
};
