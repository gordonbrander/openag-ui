// Generate a hex client ID
export const cid = () =>
  Date.now().toString(16) + '-' + Math.round(Math.random() * 1000).toString(16);