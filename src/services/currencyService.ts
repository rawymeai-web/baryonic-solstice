
export interface Currency {
    code: string;
    name: string;
    symbol: string;
    rateFromKwd: number;
}

export const currencies: Currency[] = [
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', rateFromKwd: 1 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rateFromKwd: 12.25 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rateFromKwd: 11.95 },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', rateFromKwd: 11.83 },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', rateFromKwd: 1.23 },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', rateFromKwd: 1.25 },
    { code: 'USD', name: 'US Dollar', symbol: '$', rateFromKwd: 3.25 },
    { code: 'EUR', name: 'Euro', symbol: '€', rateFromKwd: 3.00 },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', rateFromKwd: 153.50 },
];

export const convertPrice = (priceInKwd: number, targetCurrency: Currency): string => {
    if (!priceInKwd && priceInKwd !== 0) return `0 ${targetCurrency.symbol}`;

    // For KWD: standard 3 decimal places (fils) e.g., 5.000 د.ك
    if (targetCurrency.code === 'KWD') {
        const formatter = new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });
        return `${formatter.format(priceInKwd)} ${targetCurrency.symbol}`;
    }

    // For all other currencies: always round UP to nearest closed digits (whole integer, 0 decimals)
    const convertedPrice = Math.ceil(priceInKwd * targetCurrency.rateFromKwd);

    const formatter = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return `${formatter.format(convertedPrice)} ${targetCurrency.symbol}`;
};

export const getConvertedPriceValue = (priceInKwd: number, targetCurrency: Currency): number => {
    if (!priceInKwd) return 0;
    if (targetCurrency.code === 'KWD') return priceInKwd;
    return Math.ceil(priceInKwd * targetCurrency.rateFromKwd);
};
