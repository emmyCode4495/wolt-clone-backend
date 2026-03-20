// import { Request, Response, NextFunction } from 'express';
// import { body, param, query, validationResult, ValidationChain } from 'express-validator';

// export class ValidationMiddleware {
//   static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array().map((err) => ({
//           field: err.type === 'field' ? err.path : undefined,
//           message: err.msg,
//         })),
//       });
//       return;
//     }
//     next();
//   }

//   static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
//     return [param(paramName).isMongoId().withMessage('Invalid ID format')];
//   }

//   // ── Category ───────────────────────────────────────────────────────────────

//   static createCategoryValidation(): ValidationChain[] {
//     return [
//       body('name')
//         .trim()
//         .isLength({ min: 2, max: 80 })
//         .withMessage('Name must be between 2 and 80 characters'),
//       body('description')
//         .trim()
//         .isLength({ min: 10, max: 500 })
//         .withMessage('Description must be between 10 and 500 characters — helps stores identify the right category'),
//       body('icon')
//         .optional()
//         .trim()
//         .notEmpty()
//         .withMessage('Icon cannot be blank if provided'),
//       body('displayOrder')
//         .optional()
//         .isInt({ min: 0 })
//         .withMessage('Display order must be a non-negative integer'),
//     ];
//   }

//   static updateCategoryValidation(): ValidationChain[] {
//     return [
//       param('id').isMongoId().withMessage('Invalid category ID'),
//       body('name')
//         .optional()
//         .trim()
//         .isLength({ min: 2, max: 80 })
//         .withMessage('Name must be between 2 and 80 characters'),
//       body('description')
//         .optional()
//         .trim()
//         .isLength({ min: 10, max: 500 })
//         .withMessage('Description must be between 10 and 500 characters'),
//       body('icon').optional().trim(),
//       body('displayOrder').optional().isInt({ min: 0 }),
//       body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
//     ];
//   }

//   // ── City ───────────────────────────────────────────────────────────────────

//   static createCityValidation(): ValidationChain[] {
//     return [
//       body('name')
//         .trim()
//         .isLength({ min: 2, max: 100 })
//         .withMessage('City name must be between 2 and 100 characters'),
//       body('country')
//         .trim()
//         .notEmpty()
//         .withMessage('Country is required'),
//       body('state')
//         .optional()
//         .trim(),
//       body('coordinates.latitude')
//         .optional()
//         .isFloat({ min: -90, max: 90 })
//         .withMessage('Latitude must be between -90 and 90'),
//       body('coordinates.longitude')
//         .optional()
//         .isFloat({ min: -180, max: 180 })
//         .withMessage('Longitude must be between -180 and 180'),
//       body('coverImage')
//         .optional()
//         .isURL()
//         .withMessage('Cover image must be a valid URL'),
//     ];
//   }

//   static updateCityValidation(): ValidationChain[] {
//     return [
//       param('id').isMongoId().withMessage('Invalid city ID'),
//       body('name')
//         .optional()
//         .trim()
//         .isLength({ min: 2, max: 100 })
//         .withMessage('City name must be between 2 and 100 characters'),
//       body('country').optional().trim(),
//       body('state').optional().trim(),
//       body('coordinates.latitude')
//         .optional()
//         .isFloat({ min: -90, max: 90 })
//         .withMessage('Latitude must be between -90 and 90'),
//       body('coordinates.longitude')
//         .optional()
//         .isFloat({ min: -180, max: 180 })
//         .withMessage('Longitude must be between -180 and 180'),
//       body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
//       body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
//     ];
//   }

//   // ── Store ──────────────────────────────────────────────────────────────────

//   static createStoreValidation(): ValidationChain[] {
//     return [
//       body('name')
//         .trim()
//         .isLength({ min: 2, max: 120 })
//         .withMessage('Store name must be between 2 and 120 characters'),
//       body('description')
//         .trim()
//         .isLength({ min: 10, max: 1000 })
//         .withMessage('Description must be between 10 and 1000 characters'),
//       body('category')
//         .isMongoId()
//         .withMessage('A valid category ID is required'),
//       body('city')
//         .isMongoId()
//         .withMessage('A valid city ID is required'),
//       body('phone')
//         .optional()
//         .trim(),
//       body('email')
//         .optional()
//         .isEmail()
//         .normalizeEmail()
//         .withMessage('Email must be valid'),
//       body('website')
//         .optional()
//         .isURL()
//         .withMessage('Website must be a valid URL'),
//       body('logo')
//         .optional()
//         .isURL()
//         .withMessage('Logo must be a valid URL'),
//       body('coverImage')
//         .optional()
//         .isURL()
//         .withMessage('Cover image must be a valid URL'),
//       body('address')
//         .optional()
//         .isObject()
//         .withMessage('Address must be an object'),
//       body('coordinates.latitude')
//         .optional()
//         .isFloat({ min: -90, max: 90 })
//         .withMessage('Latitude must be between -90 and 90'),
//       body('coordinates.longitude')
//         .optional()
//         .isFloat({ min: -180, max: 180 })
//         .withMessage('Longitude must be between -180 and 180'),
//       body('preparationTime')
//         .optional()
//         .isInt({ min: 1 })
//         .withMessage('Preparation time must be a positive integer (minutes)'),
//       body('deliveryRadius')
//         .optional()
//         .isFloat({ min: 0 })
//         .withMessage('Delivery radius must be a positive number (km)'),
//       body('minimumOrder')
//         .optional()
//         .isFloat({ min: 0 })
//         .withMessage('Minimum order must be a positive number'),
//       body('deliveryFee')
//         .optional()
//         .isFloat({ min: 0 })
//         .withMessage('Delivery fee must be a positive number'),
//       body('openingHours')
//         .optional()
//         .isArray()
//         .withMessage('Opening hours must be an array'),
//     ];
//   }

//   static updateStoreValidation(): ValidationChain[] {
//     return [
//       param('id').isMongoId().withMessage('Invalid store ID'),
//       body('name')
//         .optional()
//         .trim()
//         .isLength({ min: 2, max: 120 })
//         .withMessage('Store name must be between 2 and 120 characters'),
//       body('description')
//         .optional()
//         .trim()
//         .isLength({ min: 10, max: 1000 })
//         .withMessage('Description must be between 10 and 1000 characters'),
//       body('category').optional().isMongoId().withMessage('Invalid category ID'),
//       body('city').optional().isMongoId().withMessage('Invalid city ID'),
//       body('email').optional().isEmail().normalizeEmail().withMessage('Email must be valid'),
//       body('website').optional().isURL().withMessage('Website must be a valid URL'),
//       body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
//       body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
//       body('preparationTime').optional().isInt({ min: 1 }),
//       body('deliveryRadius').optional().isFloat({ min: 0 }),
//       body('minimumOrder').optional().isFloat({ min: 0 }),
//       body('deliveryFee').optional().isFloat({ min: 0 }),
//       body('openingHours').optional().isArray(),
//     ];
//   }

//   static updateStoreStatusValidation(): ValidationChain[] {
//     return [
//       param('id').isMongoId().withMessage('Invalid store ID'),
//       body('status')
//         .isIn(['pending', 'active', 'suspended', 'closed'])
//         .withMessage('Status must be one of: pending, active, suspended, closed'),
//     ];
//   }

//   // ── Query helpers ──────────────────────────────────────────────────────────

//   static paginationValidation(): ValidationChain[] {
//     return [
//       query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
//       query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
//     ];
//   }
// }

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.type === 'field' ? err.path : undefined,
          message: err.msg,
        })),
      });
      return;
    }
    next();
  }

  static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
    return [param(paramName).isMongoId().withMessage('Invalid ID format')];
  }

  static paginationValidation(): ValidationChain[] {
    return [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ];
  }

  // ── Store Category ─────────────────────────────────────────────────────────

  static createCategoryValidation(): ValidationChain[] {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('Name must be between 2 and 80 characters'),
      body('description')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Description must be between 10 and 500 characters — helps stores identify the right category'),
      body('icon').optional().trim(),
      body('displayOrder').optional().isInt({ min: 0 }),
    ];
  }

  static updateCategoryValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid category ID'),
      body('name').optional().trim().isLength({ min: 2, max: 80 }),
      body('description').optional().trim().isLength({ min: 10, max: 500 }),
      body('icon').optional().trim(),
      body('displayOrder').optional().isInt({ min: 0 }),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    ];
  }

  // ── City ───────────────────────────────────────────────────────────────────

  static createCityValidation(): ValidationChain[] {
    return [
      body('name').trim().isLength({ min: 2, max: 100 }).withMessage('City name must be between 2 and 100 characters'),
      body('country').trim().notEmpty().withMessage('Country is required'),
      body('state').optional().trim(),
      body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
      body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
      body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
    ];
  }

  static updateCityValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid city ID'),
      body('name').optional().trim().isLength({ min: 2, max: 100 }),
      body('country').optional().trim(),
      body('state').optional().trim(),
      body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
      body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
      body('coverImage').optional().isURL(),
      body('isActive').optional().isBoolean(),
    ];
  }

  // ── Store ──────────────────────────────────────────────────────────────────

  static createStoreValidation(): ValidationChain[] {
    return [
      body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Store name must be between 2 and 120 characters'),
      body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
      body('category').isMongoId().withMessage('A valid category ID is required'),
      body('city').isMongoId().withMessage('A valid city ID is required'),
      body('phone').optional().trim(),
      body('email').optional().isEmail().normalizeEmail().withMessage('Email must be valid'),
      body('website').optional().isURL().withMessage('Website must be a valid URL'),
      body('logo').optional().isURL(),
      body('coverImage').optional().isURL(),
      body('address').optional().isObject(),
      body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
      body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
      body('preparationTime').optional().isInt({ min: 1 }),
      body('deliveryRadius').optional().isFloat({ min: 0 }),
      body('minimumOrder').optional().isFloat({ min: 0 }),
      body('deliveryFee').optional().isFloat({ min: 0 }),
      body('openingHours').optional().isArray().withMessage('openingHours must be an array'),
    ];
  }

  static updateStoreValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid store ID'),
      body('name').optional().trim().isLength({ min: 2, max: 120 }),
      body('description').optional().trim().isLength({ min: 10, max: 1000 }),
      body('category').optional().isMongoId(),
      body('city').optional().isMongoId(),
      body('email').optional().isEmail().normalizeEmail(),
      body('website').optional().isURL(),
      body('logo').optional().isURL(),
      body('coverImage').optional().isURL(),
      body('preparationTime').optional().isInt({ min: 1 }),
      body('deliveryRadius').optional().isFloat({ min: 0 }),
      body('minimumOrder').optional().isFloat({ min: 0 }),
      body('deliveryFee').optional().isFloat({ min: 0 }),
      body('openingHours').optional().isArray(),
    ];
  }

  static updateStoreStatusValidation(): ValidationChain[] {
    return [
      param('id').isMongoId().withMessage('Invalid store ID'),
      body('status')
        .isIn(['pending', 'active', 'suspended', 'closed'])
        .withMessage('Status must be one of: pending, active, suspended, closed'),
    ];
  }
}

// ─── Named function export ────────────────────────────────────────────────────
// Alias that lets routes use the flat import style:
//   import { validate } from '../middleware/validation.middleware'

export const validate = ValidationMiddleware.handleValidationErrors;