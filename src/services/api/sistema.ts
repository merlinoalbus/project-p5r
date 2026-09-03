// ============================================================
// API sistema — health e config
// ============================================================

import type { HealthDto } from '../../types';
import { apiGet } from './_helpers';

/** Stato di salute del backend e del database. */
export const getHealth = (): Promise<HealthDto> => apiGet<HealthDto>('/health', { silent: true, maxRetries: 0 });
