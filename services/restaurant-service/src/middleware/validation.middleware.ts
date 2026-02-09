import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  static handleValidationErrors(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.type === 'field' ? err.path : undefined,
          message: err.msg,
        })),
      });
      return;
    }
    next();
  }

  static createRestaurantValidation(): ValidationChain[] {
    return [
      body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
      body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
      body('phone').trim().notEmpty().withMessage('Phone is required'),
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('cuisine').isArray({ min: 1 }).withMessage('At least one cuisine type is required'),
      body('address.street').trim().notEmpty().withMessage('Street is required'),
      body('address.city').trim().notEmpty().withMessage('City is required'),
      body('address.state').trim().notEmpty().withMessage('State is required'),
      body('address.zipCode').trim().notEmpty().withMessage('ZIP code is required'),
      body('address.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
      body('address.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
      body('deliveryInfo.deliveryFee').isFloat({ min: 0 }).withMessage('Delivery fee must be positive'),
      body('deliveryInfo.minimumOrder').isFloat({ min: 0 }).withMessage('Minimum order must be positive'),
      body('deliveryInfo.estimatedDeliveryTime').isInt({ min: 1 }).withMessage('Estimated delivery time must be positive'),
      body('deliveryInfo.maxDeliveryDistance').isFloat({ min: 0 }).withMessage('Max delivery distance must be positive'),
    ];
  }

  static createMenuItemValidation(): ValidationChain[] {
    return [
      body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
      body('description').trim().isLength({ min: 5, max: 500 }).withMessage('Description must be between 5 and 500 characters'),
      body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
      body('categoryId').isMongoId().withMessage('Valid category ID is required'),
      body('preparationTime').optional().isInt({ min: 0 }).withMessage('Preparation time must be positive'),
    ];
  }

  static createCategoryValidation(): ValidationChain[] {
    return [
      body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
      body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
    ];
  }

  static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
    return [param(paramName).isMongoId().withMessage('Invalid ID format')];
  }
}