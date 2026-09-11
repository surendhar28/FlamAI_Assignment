import { DrawingTool, Point } from '../../../shared/protocol';

export class SchemaValidator {
  /**
   * Validates normalized coordinate point.
   */
  public static isValidPoint(point: any): point is Point {
    return (
      point &&
      typeof point === 'object' &&
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      !isNaN(point.x) &&
      !isNaN(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1
    );
  }

  /**
   * Validates tool type.
   */
  public static isValidTool(tool: any): tool is DrawingTool {
    const validTools: DrawingTool[] = [
      'brush',
      'eraser',
      'line',
      'rectangle',
      'ellipse',
      'text',
      'select',
      'pan',
    ];
    return validTools.includes(tool);
  }

  /**
   * Validates color string.
   */
  public static isValidColor(color: any): boolean {
    if (typeof color !== 'string') return false;
    // Hex color regex validation
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  }

  /**
   * Validates line stroke width.
   */
  public static isValidWidth(width: any): boolean {
    return typeof width === 'number' && !isNaN(width) && width >= 1 && width <= 100;
  }

  /**
   * Validates non-empty string ID.
   */
  public static isValidId(id: any): boolean {
    return typeof id === 'string' && id.trim().length > 0 && id.length <= 100;
  }
}
