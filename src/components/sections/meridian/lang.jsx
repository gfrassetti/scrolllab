import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * MERIDIAN — language switch (EN / ES)
 *
 * Deliberately small: it translates the template's UI CHROME (menu, labels,
 * buttons, form and footer strings) and nothing else. Placeholder content —
 * headlines, paragraphs, place names — stays whatever the buyer types into
 * the props, in whatever language their site speaks. When a prop is set it
 * wins over the dictionary in both languages, so a buyer who wants a fully
 * bilingual site passes the copy per language (or extends DICT).
 *
 * Add a language: add a key to DICT and a button in LangSwitch (NavBits).
 * Outside a <LangProvider> (e.g. the builder preview) everything falls back
 * to English and the switch is inert.
 */

export const DICT = {
  en: {
    menu: 'Menu',
    close: 'Close',
    floorPlans: 'Floor Plans',
    exploreVillas: 'Explore Villas',
    loading: 'Loading...',
    scrollDown: 'Scroll down',
    clientPortal: 'Client Portal',
    brochure: 'Brochure',
    home: 'Home',
    villas: 'Villas',
    residences: 'Residences',
    about: 'About',
    contact: 'Contact',
    investment: 'Investment',
    team: 'Team',
    partners: 'Partners',
    visualSelection: 'Visual Selection',
    easierToChoose: "It's easier to choose when you're inside.",
    selectOnGenplan: 'Select on Genplan',
    phone: 'Phone',
    email: 'Email',
    socials: 'Socials',
    seeOnMap: 'See on map',
    minDrive: 'min drive by car',
    hourDrive: 'hour drive by car',
    footerContact: 'Contact',
    salesOffice: 'Sales office',
    selectVillas: 'Select Villas',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    madeBy: 'Made by',
    rights: 'All rights reserved',
    contactEyebrow: 'Contact',
    contactTitle: 'Get in touch',
    contactBody: 'Tell us what you are looking for and our team will get back to you shortly.',
    name: 'Name',
    emailLabel: 'Email',
    message: 'Message',
    send: 'Send message',
    sending: 'Sending…',
    sent: 'Thank you — your message has been sent.',
    error: 'Something went wrong. Please try again.',
    required: 'Required',
    invalidEmail: 'Enter a valid email',
    tooShort: 'Message is too short',
    note: 'We reply within one business day.',
  },
  es: {
    menu: 'Menú',
    close: 'Cerrar',
    floorPlans: 'Planos',
    exploreVillas: 'Explorar villas',
    loading: 'Cargando...',
    scrollDown: 'Desliza',
    clientPortal: 'Portal de clientes',
    brochure: 'Folleto',
    home: 'Inicio',
    villas: 'Villas',
    residences: 'Residencias',
    about: 'Nosotros',
    contact: 'Contacto',
    investment: 'Inversión',
    team: 'Equipo',
    partners: 'Socios',
    visualSelection: 'Selección visual',
    easierToChoose: 'Es más fácil elegir cuando estás adentro.',
    selectOnGenplan: 'Elegir en el plano',
    phone: 'Teléfono',
    email: 'Email',
    socials: 'Redes',
    seeOnMap: 'Ver en el mapa',
    minDrive: 'min en auto',
    hourDrive: 'hora en auto',
    footerContact: 'Contacto',
    salesOffice: 'Oficina de ventas',
    selectVillas: 'Elegir villa',
    privacy: 'Política de privacidad',
    terms: 'Términos de uso',
    madeBy: 'Hecho por',
    rights: 'Todos los derechos reservados',
    contactEyebrow: 'Contacto',
    contactTitle: 'Hablemos',
    contactBody: 'Cuéntanos qué buscas y nuestro equipo te responderá en breve.',
    name: 'Nombre',
    emailLabel: 'Email',
    message: 'Mensaje',
    send: 'Enviar mensaje',
    sending: 'Enviando…',
    sent: 'Gracias — tu mensaje fue enviado.',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    required: 'Obligatorio',
    invalidEmail: 'Ingresa un email válido',
    tooShort: 'El mensaje es muy corto',
    note: 'Respondemos en un día hábil.',
  },
}

const STORAGE_KEY = 'meridian-lang'

const Ctx = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => DICT.en[key] ?? key,
})

export function LangProvider({ children, initial = 'en' }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && DICT[saved]) return saved
    } catch {
      /* storage blocked — fall through */
    }
    return initial
  })

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* private mode — the choice just doesn't persist */
    }
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang: (next) => DICT[next] && setLang(next),
      t: (key) => DICT[lang][key] ?? DICT.en[key] ?? key,
    }),
    [lang],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang() {
  return useContext(Ctx)
}
