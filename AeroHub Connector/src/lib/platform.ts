// Em que sistema está o app: muda os textos e as opções que só existem num deles
// (ex.: "Start with Windows" no Windows, "Open at login" no Mac).
export const isMac = /Mac/i.test(navigator.userAgent);
