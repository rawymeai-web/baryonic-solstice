const text = 'التحدث مع الحيوانات وفهم لغتها.';
let sanitized = text.replace(/[^\x00-\x7F]/g, '');
console.log('After ASCII filter: [' + sanitized + ']');
sanitized = sanitized.replace(/^[.,\s]+|[.,\s]+$/g, '');
console.log('After trim filter: [' + sanitized + ']');
