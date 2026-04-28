import { Injectable } from '@nestjs/common';
import { BillingPreview } from '../common/types';

export type GenerateBillInput = {
  previousReading?: number | null;
  currentReading: number;
  unitPrice: number;
};

@Injectable()
export class BillingService {
  calculate(input: GenerateBillInput): BillingPreview {
    const previous = input.previousReading ?? 0;
    const usage = Math.max(0, input.currentReading - previous);
    const total = usage * input.unitPrice;

    return {
      previousReading: previous,
      currentReading: input.currentReading,
      usageQuantity: Number(usage.toFixed(3)),
      unitPrice: Number(input.unitPrice.toFixed(2)),
      totalBill: Number(total.toFixed(2)),
    };
  }

  /**
   * Placeholder OCR extraction, to be replaced by Tesseract.js or API integration.
   */
  extractReadingFromImage(imageUrl: string): number | null {
    if (!imageUrl) {
      return null;
    }
    return null;
  }
}
