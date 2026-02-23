// فایل: utils/dateUtils.ts (کد کامل و نهایی)

import moment from 'jalali-moment';

/**
 * Converts an ISO or a Shamsi date string to a consistent Shamsi formatted date string.
 * This function is now robust and can handle both ISO ("2023-10-27") and Shamsi ("1402/08/05") inputs.
 * @param dateString The date string to convert.
 * @param format The desired Shamsi output format (default: 'YYYY/MM/DD').
 * @returns The formatted Shamsi date string or a placeholder if input is invalid.
 */
export const formatIsoToShamsi = (dateString?: string | null, format: string = 'YYYY/MM/DD'): string => {
  if (!dateString) return 'نامشخص';

  // Smartly determine the format of the input string
  const isISOFormat = dateString.includes('-');

  // Use the correct parsing method based on the detected format
  const m = isISOFormat 
    ? moment(dateString, moment.ISO_8601) 
    : moment(dateString, 'jYYYY/jMM/jDD');
  
  return m.isValid() ? m.locale('fa').format(format) : 'تاریخ نامعتبر';
};


/**
 * Converts an ISO date string to a Shamsi formatted date-time string.
 * @param isoDateString The ISO date string (e.g., "2023-10-27T10:30:00.000Z").
 * @param format The desired Shamsi format string (default: 'YYYY/MM/DD HH:mm').
 * @returns The formatted Shamsi date-time string or a placeholder if input is invalid.
 */
export const formatIsoToShamsiDateTime = (isoDateString?: string | null, format: string = 'YYYY/MM/DD HH:mm'): string => {
  if (!isoDateString) return 'نامشخص';
  
  const m = moment(isoDateString);
  
  return m.isValid() ? m.locale('fa').format(format) : 'تاریخ نامعتبر';
};