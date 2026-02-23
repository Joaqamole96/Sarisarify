/**
 * Phase 2: LSTM Forecasting
 *
 * This module activates automatically once ≥ 500 Sales have been recorded.
 * Until then, the Phase 1 rule-based module handles all forecasting.
 *
 * Architecture:
 *   featureBuilder  →  builds daily time-series tensors from SQLite
 *   trainer         →  trains an LSTM model using TensorFlow.js (background task)
 *   predictor       →  runs inference on the trained model (this file)
 */

import type { Insight, ForecastItem } from '@/types';
import { runRules } from '../phase1/patternDetector';

/**
 * Entry point called by phaseController when Sale count ≥ 500.
 *
 * NOTE: Full LSTM implementation is built in Phase 2 of development.
 * Until then, this gracefully delegates to Phase 1 while the
 * architecture and wiring are already in place.
 */
export async function runLSTM(): Promise<{
  insights: Insight[];
  forecast: ForecastItem[];
}> {
  // TODO (Phase 2): load trained model from filesystem, build feature tensors,
  // run tf.model.predict(), map outputs back to ForecastItem[].
  // Phase 1 pattern detection continues to run alongside LSTM.
  return runRules();
}
