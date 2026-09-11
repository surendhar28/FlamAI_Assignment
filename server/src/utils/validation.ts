import { DrawingTool, Point3D } from '../../../shared/protocol';

export class SchemaValidator {
  /**
   * Validates 3D spatial coordinate point.
   */
  public static isValidPoint(point: any): point is Point3D {
    return (
      point &&
      typeof point === 'object' &&
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      typeof point.z === 'number' &&
      !isNaN(point.x) &&
      !isNaN(point.y) &&
      !isNaN(point.z)
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
      'box',
      'sphere',
      'cylinder',
      'text',
      'select',
      'orbit',
    ];
    return validTools.includes(tool);
  }

  /**
   * Validates color string.
   */
  public static isValidColor(color: any): boolean {
    if (typeof color !== 'string') return false;
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  }

  /**
   * Validates line stroke width / mesh size.
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
