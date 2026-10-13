import type { Locale } from '../locale.js';

/**
 * The words of the demo day, one dictionary per language. English is the
 * source: a Spanish dictionary that misses a key, or has one more, does not
 * compile, and neither does a locale without a dictionary.
 */
const en = {
  'calendar.work': 'Work',
  'calendar.personal': 'Personal',
  'calendar.health': 'Health',
  'task.checklist': 'Draft launch checklist',
  'task.releaseNotes': 'Write release notes',
  'task.venue': 'Reply to Sam about the venue',
  'task.sprint': 'Plan next sprint',
  'task.dentist': 'Book dentist appointment',
  'task.invoice': 'Send invoice',
  'block.standUp': 'Stand-up',
  'block.designReview': 'Design review',
  'block.lunch': 'Lunch with Marta',
  'block.customerCall': 'Customer call',
  'block.pullRequests': 'Review pull requests',
  'block.gym': 'Gym',
  'block.oneToOne': '1:1 with Alex',
  'allDay.releaseWeek': 'Release week',
  'user.displayName': 'Demo User',
} as const;

export type DemoTextKey = keyof typeof en;

type DemoTexts = Readonly<Record<DemoTextKey, string>>;

const es: DemoTexts = {
  'calendar.work': 'Trabajo',
  'calendar.personal': 'Personal',
  'calendar.health': 'Salud',
  'task.checklist': 'Preparar la lista del lanzamiento',
  'task.releaseNotes': 'Redactar las notas de la versión',
  'task.venue': 'Responder a Sam sobre el local',
  'task.sprint': 'Planificar el próximo sprint',
  'task.dentist': 'Pedir cita con el dentista',
  'task.invoice': 'Enviar la factura',
  'block.standUp': 'Reunión diaria',
  'block.designReview': 'Revisión de diseño',
  'block.lunch': 'Comida con Marta',
  'block.customerCall': 'Llamada con cliente',
  'block.pullRequests': 'Revisar pull requests',
  'block.gym': 'Gimnasio',
  'block.oneToOne': '1:1 con Alex',
  'allDay.releaseWeek': 'Semana de lanzamiento',
  'user.displayName': 'Usuario de la demo',
};

export const DEMO_TEXTS: Readonly<Record<Locale, DemoTexts>> = { en, es };
