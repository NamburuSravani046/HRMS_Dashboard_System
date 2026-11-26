
const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
};

export const setCookie = (res, name, value) => {
  res.cookie(name, value, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearCookie = (res, name) => {
  res.clearCookie(name, getCookieOptions());
};

export const setAccessTokenCookie = (res, name, value) => {
  res.cookie(name, value, {
    ...getCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
};
