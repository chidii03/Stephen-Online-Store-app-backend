import { v4 as uuidv4 } from 'uuid';

export const generateTrackingId = () => {
  return `TRK-${uuidv4().split('-')[1].toUpperCase()}-${Date.now().toString().slice(-4)}`;
};