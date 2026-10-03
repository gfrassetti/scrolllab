import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { db } from '../db.js'

/**
 * Usuario de un perfil de Google: lo encuentra por googleId, lo vincula por
 * email o lo crea. Solo vincula por email una cuenta que todavía no tiene
 * googleId: si el email ya es de otra cuenta de Google, corta (evita que
 * alguien tome una cuenta ajena con un Google que comparte el mail).
 */
export async function resolveGoogleUser(profile) {
  const email = profile.emails?.[0]?.value
  if (!email) throw new Error('Google profile without email')
  let user = await db.findUser({ googleId: profile.id })
  if (!user) {
    const byEmail = await db.findUser({ email })
    // Solo linkear por email si aún no tiene googleId (evitar takeover)
    if (byEmail && !byEmail.googleId) {
      byEmail.googleId = profile.id
      byEmail.name = profile.displayName || byEmail.name
      byEmail.avatar = profile.photos?.[0]?.value || byEmail.avatar
      user = await db.updateUser(byEmail)
    } else if (!byEmail) {
      user = await db.createUser({
        googleId: profile.id,
        email,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      })
    } else {
      throw new Error('Email ya asociado a otra cuenta')
    }
  } else {
    user.name = profile.displayName || user.name
    user.avatar = profile.photos?.[0]?.value || user.avatar
    await db.updateUser(user)
  }
  return user
}

/**
 * Sesión de Passport (el id del usuario en la cookie) y, si hay credenciales,
 * la estrategia de Google. Passport es un singleton: se llama una vez por
 * createApp, después de `passport.initialize()` / `passport.session()`.
 */
export function configurePassport(config) {
  passport.serializeUser((user, done) => done(null, db.uid(user)))
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await db.findUserById(id))
    } catch (err) {
      done(err)
    }
  })

  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            done(null, await resolveGoogleUser(profile))
          } catch (err) {
            done(err)
          }
        },
      ),
    )
  }
}
