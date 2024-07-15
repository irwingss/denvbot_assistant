import Sandbox from './sandbox'

export const metadata = {
  title: 'DENVBot',
  description: 'Chatbot de la Dirección General de Intervenciones Estratégicas en Salud Pública (DGIESP-MINSA), Perú. Se enfoca en resolver consultas sobre el manejo de Dengue según las normas peruanas.',
  icons: {
    icon: '/icon_denvbot.svg',
    shortcut: '/icon_denvbot.svg',
  }
}

export const viewport = {
  viewport: 'maximum-scale=1.0, minimum-scale=1.0, initial-scale=1.0, width=device-width, user-scalable=0',
}

export default function Page() {
  return <Sandbox />
}