
const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const thousands = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

export function numberToPersianWords(num: number): string {
    if (num === 0) return 'صفر';
    if (num < 0) return 'منفی ' + numberToPersianWords(Math.abs(num));

    let result = '';
    let partCount = 0;

    while (num > 0) {
        const part = num % 1000;
        if (part !== 0) {
            const partWords = convertThreeDigits(part);
            const unit = thousands[partCount];
            result = partWords + (unit ? ' ' + unit : '') + (result ? ' و ' + result : '');
        }
        num = Math.floor(num / 1000);
        partCount++;
    }

    return result.trim();
}

function convertThreeDigits(num: number): string {
    let result = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (h > 0) {
        result += hundreds[h];
    }

    const lastTwo = num % 100;
    if (lastTwo > 0) {
        if (result !== '') result += ' و ';
        if (lastTwo < 10) {
            result += units[lastTwo];
        } else if (lastTwo < 20) {
            result += teens[lastTwo - 10];
        } else {
            result += tens[t];
            if (u > 0) {
                result += ' و ' + units[u];
            }
        }
    }

    return result;
}
