import * as saleRepository from '@/repositories/saleRepository';
import type { Insight, ForecastItem, MLPhase } from '@/types';

const LSTM_TRIGGER = 500;

interface AssistantResult {
  insights: Insight[];
  forecast: ForecastItem[];
  phase: MLPhase;
}

export async function runAssistant(): Promise<AssistantResult> {
  const totalSales = await saleRepository.getTotalSaleCount();
  const phase: MLPhase = totalSales >= LSTM_TRIGGER ? 'lstm' : 'rule';

  if (phase === 'lstm') {
    const { runLSTM } = await import('./phase2/predictor');
    return { ...(await runLSTM()), phase };
  }

  const { runRules } = await import('./phase1/patternDetector');
  return { ...(await runRules()), phase };
}
