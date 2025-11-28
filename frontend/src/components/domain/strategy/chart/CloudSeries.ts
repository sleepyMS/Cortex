// file: frontend/src/components/domain/strategy/chart/CloudSeries.ts

import {
  CustomSeriesPricePlotValues,
  ICustomSeriesPaneView,
  PaneRendererCustomData,
  WhitespaceData,
  Time,
  ICustomSeriesPaneRenderer,
  PriceToCoordinateConverter,
  CustomSeriesOptions,
} from "lightweight-charts";

// =================================================================================
// Data Structure
// =================================================================================

export interface CloudData {
  time: Time;
  upperValue: number;
  lowerValue: number;
  color?: string;
}

export interface CloudSeriesOptions extends CustomSeriesOptions {
  cloudColor: string;
}

export const defaultOptions: CloudSeriesOptions = {
  cloudColor: "rgba(33, 150, 243, 0.15)",
} as CloudSeriesOptions;

// =================================================================================
// Renderer Implementation
// =================================================================================

interface CloudBarItem {
  x: number;
  upperValue: number;
  lowerValue: number;
  color: string;
}

class CloudSeriesRenderer implements ICustomSeriesPaneRenderer {
  private _data: CloudBarItem[] = [];

  draw(target: any, priceConverter: PriceToCoordinateConverter): void {
    // Lightweight Charts v5 uses useBitmapCoordinateSpace
    if (target.useBitmapCoordinateSpace) {
      target.useBitmapCoordinateSpace((scope: any) => {
        const ctx = scope.context;
        this.drawCloud(
          ctx,
          priceConverter,
          scope.horizontalPixelRatio,
          scope.verticalPixelRatio
        );
      });
    }
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    priceConverter: PriceToCoordinateConverter,
    horizontalPixelRatio: number,
    verticalPixelRatio: number
  ): void {
    if (this._data.length === 0) {
      return;
    }

    ctx.save();

    let drawnCount = 0;
    for (let i = 0; i < this._data.length - 1; i++) {
      const curr = this._data[i];
      const next = this._data[i + 1];

      const y1Upper = priceConverter(curr.upperValue);
      const y2Upper = priceConverter(next.upperValue);
      const y1Lower = priceConverter(curr.lowerValue);
      const y2Lower = priceConverter(next.lowerValue);

      if (
        y1Upper === null ||
        y2Upper === null ||
        y1Lower === null ||
        y2Lower === null
      ) {
        continue;
      }

      // Scale coordinates for bitmap
      const x1 = curr.x * horizontalPixelRatio;
      const x2 = next.x * horizontalPixelRatio;
      const scaledY1Upper = y1Upper * verticalPixelRatio;
      const scaledY2Upper = y2Upper * verticalPixelRatio;
      const scaledY1Lower = y1Lower * verticalPixelRatio;
      const scaledY2Lower = y2Lower * verticalPixelRatio;

      ctx.beginPath();
      ctx.moveTo(x1, scaledY1Upper);
      ctx.lineTo(x2, scaledY2Upper);
      ctx.lineTo(x2, scaledY2Lower);
      ctx.lineTo(x1, scaledY1Lower);
      ctx.closePath();

      ctx.fillStyle = curr.color;
      ctx.fill();
      drawnCount++;
    }

    ctx.restore();
  }

  update(data: CloudBarItem[]): void {
    this._data = data;
  }
}

// =================================================================================
// Pane View Implementation
// =================================================================================

class CloudSeriesPaneView
  implements ICustomSeriesPaneView<Time, CloudData, CloudSeriesOptions>
{
  private _renderer: CloudSeriesRenderer = new CloudSeriesRenderer();
  private _options: CloudSeriesOptions = defaultOptions;

  update(
    data: PaneRendererCustomData<Time, CloudData>,
    options: CloudSeriesOptions
  ): void {
    this._options = options;

    // Process and update renderer immediately
    if (data.bars && data.bars.length > 0) {
      const bars: CloudBarItem[] = data.bars.map((bar) => {
        const cloudData = bar.originalData as CloudData;
        return {
          x: bar.x,
          upperValue: cloudData.upperValue,
          lowerValue: cloudData.lowerValue,
          color: cloudData.color || options.cloudColor,
        };
      });

      this._renderer.update(bars);
    } else {
      this._renderer.update([]);
    }
  }

  renderer(): ICustomSeriesPaneRenderer {
    return this._renderer;
  }

  priceValueBuilder(plotRow: CloudData): CustomSeriesPricePlotValues {
    return [
      plotRow.upperValue,
      plotRow.lowerValue,
      (plotRow.upperValue + plotRow.lowerValue) / 2,
    ];
  }

  isWhitespace(data: CloudData | WhitespaceData): data is WhitespaceData {
    return (data as CloudData).upperValue === undefined;
  }

  zOrder(): "bottom" | "normal" | "top" {
    return "bottom";
  }

  defaultOptions(): CloudSeriesOptions {
    return { ...defaultOptions };
  }
}

// =================================================================================
// Custom Series Definition
// =================================================================================

export class CloudSeries
  implements ICustomSeriesPaneView<Time, CloudData, CloudSeriesOptions>
{
  private _paneView: CloudSeriesPaneView = new CloudSeriesPaneView();

  update(
    data: PaneRendererCustomData<Time, CloudData>,
    options: CloudSeriesOptions
  ): void {
    this._paneView.update(data, options);
  }

  renderer(): ICustomSeriesPaneRenderer {
    return this._paneView.renderer();
  }

  priceValueBuilder(plotRow: CloudData): CustomSeriesPricePlotValues {
    return this._paneView.priceValueBuilder(plotRow);
  }

  isWhitespace(data: CloudData | WhitespaceData): data is WhitespaceData {
    return this._paneView.isWhitespace(data);
  }

  zOrder(): "bottom" | "normal" | "top" {
    return this._paneView.zOrder();
  }

  defaultOptions(): CloudSeriesOptions {
    return this._paneView.defaultOptions();
  }
}

export const customSeriesDefaultOptions = defaultOptions;
