export function koreanFullDateTime(date: Date) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + 9);
  const parts: string[] = [];
  parts.push(newDate.getFullYear() + '년');
  parts.push((newDate.getMonth() + 1) + '월');
  parts.push(newDate.getDate() + '일');
  parts.push(`${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}`);
  return parts.join(' ');
}

export function koreanFullDate(date: Date) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + 9);
  const parts: string[] = [];
  parts.push(newDate.getFullYear() + '년');
  parts.push((newDate.getMonth() + 1) + '월');
  parts.push(newDate.getDate() + '일');
  return parts.join(' ');
}
