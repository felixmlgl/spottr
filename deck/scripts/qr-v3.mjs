// Writes the QR code for the live demo link used on the v3 ask slide: deck/v3/assets/qr-demo.svg
import QRCode from 'qrcode';
import fs from 'node:fs';
const svg = await QRCode.toString('https://tryspottr.app/demo', { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#0000' } });
fs.writeFileSync(new URL('../v3/assets/qr-demo.svg', import.meta.url), svg);
console.log('ok', svg.length);
