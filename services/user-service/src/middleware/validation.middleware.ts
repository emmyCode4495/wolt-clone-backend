// import { Request, Response, NextFunction } from 'express';
// import { body, param, validationResult, ValidationChain } from 'express-validator';

// export class ValidationMiddleware {
//   /**
//    * Handle validation errors
//    */
//   static handleValidationErrors(
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ): void {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array().map(err => ({
//           field: err.type === 'field' ? err.path : undefined,
//           message: err.msg,
//         })),
//       });
//       return;
//     }

//     next();
//   }

//   /**
//    * Registration validation rules
//    */
//   static registerValidation(): ValidationChain[] {
//     return [
//       body('email')
//         .isEmail()
//         .withMessage('Please provide a valid email')
//         .normalizeEmail(),
//       body('password')
//         .isLength({ min: 6 })
//         .withMessage('Password must be at least 6 characters long')
//         .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//         .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
//       body('firstName')
//         .trim()
//         .notEmpty()
//         .withMessage('First name is required')
//         .isLength({ min: 2, max: 50 })
//         .withMessage('First name must be between 2 and 50 characters'),
//       body('lastName')
//         .trim()
//         .notEmpty()
//         .withMessage('Last name is required')
//         .isLength({ min: 2, max: 50 })
//         .withMessage('Last name must be between 2 and 50 characters'),
//       body('phone')
//         .trim()
//         .notEmpty()
//         .withMessage('Phone number is required')
//         .matches(/^\+?[1-9]\d{1,14}$/)
//         .withMessage('Please provide a valid phone number'),
//       body('role')
//         .optional()
//         .isIn(['customer', 'driver', 'restaurant_owner'])
//         .withMessage('Invalid role'),
//     ];
//   }

//   /**
//    * Login validation rules
//    */
//   static loginValidation(): ValidationChain[] {
//     return [
//       body('email')
//         .isEmail()
//         .withMessage('Please provide a valid email')
//         .normalizeEmail(),
//       body('password')
//         .notEmpty()
//         .withMessage('Password is required'),
//     ];
//   }

//   /**
//    * Update profile validation rules
//    */
//   static updateProfileValidation(): ValidationChain[] {
//     return [
//       body('firstName')
//         .optional()
//         .trim()
//         .isLength({ min: 2, max: 50 })
//         .withMessage('First name must be between 2 and 50 characters'),
//       body('lastName')
//         .optional()
//         .trim()
//         .isLength({ min: 2, max: 50 })
//         .withMessage('Last name must be between 2 and 50 characters'),
//       body('phone')
//         .optional()
//         .trim()
//         .matches(/^\+?[1-9]\d{1,14}$/)
//         .withMessage('Please provide a valid phone number'),
//     ];
//   }

//   /**
//    * Add address validation rules
//    */
//   static addAddressValidation(): ValidationChain[] {
//     return [
//       body('street')
//         .trim()
//         .notEmpty()
//         .withMessage('Street is required'),
//       body('city')
//         .trim()
//         .notEmpty()
//         .withMessage('City is required'),
//       body('state')
//         .trim()
//         .notEmpty()
//         .withMessage('State is required'),
//       body('zipCode')
//         .trim()
//         .notEmpty()
//         .withMessage('ZIP code is required'),
//       body('country')
//         .optional()
//         .trim()
//         .notEmpty()
//         .withMessage('Country cannot be empty'),
//       body('coordinates.latitude')
//         .optional()
//         .isFloat({ min: -90, max: 90 })
//         .withMessage('Invalid latitude'),
//       body('coordinates.longitude')
//         .optional()
//         .isFloat({ min: -180, max: 180 })
//         .withMessage('Invalid longitude'),
//       body('label')
//         .optional()
//         .trim()
//         .isLength({ max: 50 })
//         .withMessage('Label must be less than 50 characters'),
//       body('isDefault')
//         .optional()
//         .isBoolean()
//         .withMessage('isDefault must be a boolean'),
//     ];
//   }

//   /**
//    * Change password validation rules
//    */
//   static changePasswordValidation(): ValidationChain[] {
//     return [
//       body('currentPassword')
//         .notEmpty()
//         .withMessage('Current password is required'),
//       body('newPassword')
//         .isLength({ min: 6 })
//         .withMessage('New password must be at least 6 characters long')
//         .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//         .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
//     ];
//   }

//   /**
//    * MongoDB ID validation
//    */
//   static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
//     return [
//       param(paramName)
//         .isMongoId()
//         .withMessage('Invalid ID format'),
//     ];
//   }
// }

import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  /**
   * Handle validation errors
   */
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

  /**
   * Registration validation rules
   */
  static registerValidation(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
      body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
      body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
      body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),
      body('role')
        .optional()
        .isIn(['customer', 'driver', 'restaurant_owner'])
        .withMessage('Invalid role'),
    ];
  }

  /**
   * Login validation rules
   */
  static loginValidation(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
    ];
  }

  /**
   * Update profile validation rules
   */
  static updateProfileValidation(): ValidationChain[] {
    return [
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
      body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
      body('phone')
        .optional()
        .trim()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),
    ];
  }

  /**
   * Add address validation rules
   */
  static addAddressValidation(): ValidationChain[] {
    return [
      body('street')
        .trim()
        .notEmpty()
        .withMessage('Street is required'),
      body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
      body('state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),
      body('zipCode')
        .trim()
        .notEmpty()
        .withMessage('ZIP code is required'),
      body('country')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Country cannot be empty'),
      body('coordinates.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
      body('coordinates.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
      body('label')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Label must be less than 50 characters'),
      body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('isDefault must be a boolean'),
    ];
  }

  /**
   * Change password validation rules
   */
  static changePasswordValidation(): ValidationChain[] {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
      body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    ];
  }

  /**
   * MongoDB ID validation
   */
  static mongoIdValidation(paramName: string = 'id'): ValidationChain[] {
    return [
      param(paramName)
        .isMongoId()
        .withMessage('Invalid ID format'),
    ];
  }
}