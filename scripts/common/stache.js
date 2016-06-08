/*
A super thin implementation of string variable replacement.

Example:

    var s = 'Username: {{username}}';
    var rendered = render(s, {
      username: 'x'
    });
*/

const pattern = /{{(\w+)}}/g

export const escapeHtml = string =>
  string
    .replace('<', '&lt;')
    .replace('>', '&gt;')
    .replace('&', '&amp;');

export const render = (string, context) =>
  string.replace(pattern, (match, group1) => escapeHtml(context[group1] || ''));
