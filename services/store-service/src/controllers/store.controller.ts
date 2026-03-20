// import { Request, Response, NextFunction } from 'express';
// import { Store } from '../models/store.model';
// import { City } from '../models/city.model';
// import { Category } from '../models/category.model';

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const buildStoreFilter = (query: Record<string, unknown>) => {
//   const filter: Record<string, unknown> = {};

//   if (query.city)       filter.city     = query.city;
//   if (query.category)   filter.category = query.category;
//   if (query.status)     filter.status   = query.status;
//   if (query.ownerId)    filter.ownerId  = query.ownerId;
//   if (query.featured === 'true') filter.isFeatured = true;

//   if (query.search) {
//     filter.$or = [
//       { name:        { $regex: query.search, $options: 'i' } },
//       { description: { $regex: query.search, $options: 'i' } },
//     ];
//   }

//   return filter;
// };

// // ─── GET /stores ──────────────────────────────────────────────────────────────
// // Public. Supports ?city=&category=&search=&featured=&page=&limit=
// export const getAllStores = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
//     const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
//     const skip  = (page - 1) * limit;

//     const filter = buildStoreFilter({ ...req.query, status: 'active' });

//     const [stores, total] = await Promise.all([
//       Store.find(filter)
//         .populate('category', 'name slug icon')
//         .populate('city',     'name slug country state')
//         .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Store.countDocuments(filter),
//     ]);

//     res.json({
//       success: true,
//       data: stores,
//       pagination: { total, page, limit, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── GET /stores/all  (admin) ─────────────────────────────────────────────────
// export const getAllStoresAdmin = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
//     const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
//     const skip  = (page - 1) * limit;

//     const filter = buildStoreFilter(req.query as Record<string, unknown>);

//     const [stores, total] = await Promise.all([
//       Store.find(filter)
//         .populate('category', 'name slug icon')
//         .populate('city',     'name slug country state')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Store.countDocuments(filter),
//     ]);

//     res.json({
//       success: true,
//       data: stores,
//       pagination: { total, page, limit, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── GET /stores/:id ──────────────────────────────────────────────────────────
// export const getStoreById = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const store = await Store.findById(req.params.id)
//       .populate('category', 'name slug icon description')
//       .populate('city',     'name slug country state coordinates')
//       .lean();

//     if (!store) {
//       res.status(404).json({ success: false, message: 'Store not found' });
//       return;
//     }

//     res.json({ success: true, data: store });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── GET /stores/slug/:slug ───────────────────────────────────────────────────
// export const getStoreBySlug = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const store = await Store.findOne({ slug: req.params.slug })
//       .populate('category', 'name slug icon description')
//       .populate('city',     'name slug country state coordinates')
//       .lean();

//     if (!store) {
//       res.status(404).json({ success: false, message: 'Store not found' });
//       return;
//     }

//     res.json({ success: true, data: store });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── GET /stores/city/:cityId ─────────────────────────────────────────────────
// // Convenience: all active stores in a city, optionally filtered by ?category=
// export const getStoresByCity = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
//     const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
//     const skip  = (page - 1) * limit;

//     const filter: Record<string, unknown> = {
//       city: req.params.cityId,
//       status: 'active',
//     };
//     if (req.query.category) filter.category = req.query.category;

//     const [stores, total] = await Promise.all([
//       Store.find(filter)
//         .populate('category', 'name slug icon')
//         .populate('city',     'name slug country state')
//         .sort({ isFeatured: -1, rating: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Store.countDocuments(filter),
//     ]);

//     res.json({
//       success: true,
//       data: stores,
//       pagination: { total, page, limit, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── GET /stores/my  (authenticated store owner) ──────────────────────────────
// export const getMyStores = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const stores = await Store.find({ ownerId: req.user!.userId })
//       .populate('category', 'name slug icon')
//       .populate('city',     'name slug country state')
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json({ success: true, count: stores.length, data: stores });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── POST /stores ─────────────────────────────────────────────────────────────
// export const createStore = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const {
//       name, description,
//       category: categoryId, city: cityId,
//       address, coordinates,
//       phone, email, website,
//       logo, coverImage,
//       openingHours, preparationTime, deliveryRadius, minimumOrder, deliveryFee,
//     } = req.body;

//     // Validate city and category exist and are active
//     const [city, category] = await Promise.all([
//       City.findById(cityId),
//       Category.findById(categoryId),
//     ]);

//     if (!city || !city.isActive) {
//       res.status(422).json({ success: false, message: 'City not found or is not currently active' });
//       return;
//     }
//     if (!category || !category.isActive) {
//       res.status(422).json({ success: false, message: 'Category not found or is not currently active' });
//       return;
//     }

//     const store = await Store.create({
//       name,
//       description,
//       category: categoryId,
//       city: cityId,
//       ownerId: req.user!.userId,
//       address,
//       coordinates,
//       phone,
//       email,
//       website,
//       logo,
//       coverImage,
//       openingHours,
//       preparationTime,
//       deliveryRadius,
//       minimumOrder,
//       deliveryFee,
//       status: req.user!.role === 'admin' ? 'active' : 'pending',
//     });

//     const populated = await store.populate([
//       { path: 'category', select: 'name slug icon' },
//       { path: 'city',     select: 'name slug country state' },
//     ]);

//     res.status(201).json({ success: true, message: 'Store created successfully', data: populated });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── PUT /stores/:id ──────────────────────────────────────────────────────────
// export const updateStore = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const store = await Store.findById(req.params.id);
//     if (!store) {
//       res.status(404).json({ success: false, message: 'Store not found' });
//       return;
//     }

//     // Owners can only edit their own stores; admins can edit any
//     if (req.user!.role !== 'admin' && store.ownerId !== req.user!.userId) {
//       res.status(403).json({ success: false, message: 'You do not own this store' });
//       return;
//     }

//     const updatableFields = [
//       'name', 'description', 'phone', 'email', 'website',
//       'logo', 'coverImage', 'address', 'coordinates',
//       'openingHours', 'preparationTime', 'deliveryRadius',
//       'minimumOrder', 'deliveryFee',
//     ] as const;

//     updatableFields.forEach((field) => {
//       if (req.body[field] !== undefined) (store as any)[field] = req.body[field];
//     });

//     // Category / city changes — validate before applying
//     if (req.body.category && req.body.category !== String(store.category)) {
//       const cat = await Category.findById(req.body.category);
//       if (!cat || !cat.isActive) {
//         res.status(422).json({ success: false, message: 'Invalid or inactive category' });
//         return;
//       }
//       store.category = req.body.category;
//     }

//     if (req.body.city && req.body.city !== String(store.city)) {
//       const city = await City.findById(req.body.city);
//       if (!city || !city.isActive) {
//         res.status(422).json({ success: false, message: 'Invalid or inactive city' });
//         return;
//       }
//       store.city = req.body.city;
//     }

//     // Only admins can change status / verification flags
//     if (req.user!.role === 'admin') {
//       if (req.body.status     !== undefined) store.status     = req.body.status;
//       if (req.body.isVerified !== undefined) store.isVerified = req.body.isVerified;
//       if (req.body.isFeatured !== undefined) store.isFeatured = req.body.isFeatured;
//     }

//     await store.save();
//     await store.populate([
//       { path: 'category', select: 'name slug icon' },
//       { path: 'city',     select: 'name slug country state' },
//     ]);

//     res.json({ success: true, message: 'Store updated', data: store });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── PATCH /stores/:id/status  (admin) ───────────────────────────────────────
// export const updateStoreStatus = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { status } = req.body;
//     const store = await Store.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true, runValidators: true }
//     ).populate('category city');

//     if (!store) {
//       res.status(404).json({ success: false, message: 'Store not found' });
//       return;
//     }

//     res.json({ success: true, message: `Store status updated to ${status}`, data: store });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── DELETE /stores/:id ───────────────────────────────────────────────────────
// export const deleteStore = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const store = await Store.findById(req.params.id);
//     if (!store) {
//       res.status(404).json({ success: false, message: 'Store not found' });
//       return;
//     }

//     if (req.user!.role !== 'admin' && store.ownerId !== req.user!.userId) {
//       res.status(403).json({ success: false, message: 'You do not own this store' });
//       return;
//     }

//     await Store.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: 'Store deleted' });
//   } catch (err) {
//     next(err);
//   }
// };


import { Response, NextFunction } from 'express';
import { Store } from '../models/store.model';
import { City } from '../models/city.model';
import { Category } from '../models/category.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStoreFilter = (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};

  if (query.city)     filter.city     = query.city;
  if (query.category) filter.category = query.category;
  if (query.status)   filter.status   = query.status;
  if (query.ownerId)  filter.ownerId  = query.ownerId;
  if (query.featured === 'true') filter.isFeatured = true;

  if (query.search) {
    filter.$or = [
      { name:        { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
};

// ── GET /stores ───────────────────────────────────────────────────────────────
export const getAllStores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter = buildStoreFilter({ ...req.query, status: 'active' });

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .populate('category', 'name slug icon')
        .populate('city',     'name slug country state')
        .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stores,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /stores/admin/all ─────────────────────────────────────────────────────
export const getAllStoresAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter = buildStoreFilter(req.query as Record<string, unknown>);

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .populate('category', 'name slug icon')
        .populate('city',     'name slug country state')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stores,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /stores/:id ───────────────────────────────────────────────────────────
export const getStoreById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('category', 'name slug icon description')
      .populate('city',     'name slug country state coordinates')
      .lean();

    if (!store) throw new AppError('Store not found', 404);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

// ── GET /stores/slug/:slug ────────────────────────────────────────────────────
export const getStoreBySlug = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findOne({ slug: req.params.slug })
      .populate('category', 'name slug icon description')
      .populate('city',     'name slug country state coordinates')
      .lean();

    if (!store) throw new AppError('Store not found', 404);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
};

// ── GET /stores/city/:cityId ──────────────────────────────────────────────────
export const getStoresByCity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      city: req.params.cityId,
      status: 'active',
    };
    if (req.query.category) filter.category = req.query.category;

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .populate('category', 'name slug icon')
        .populate('city',     'name slug country state')
        .sort({ isFeatured: -1, rating: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stores,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /stores/me/stores ─────────────────────────────────────────────────────
export const getMyStores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ✅ Fixed: was req.user!.userId — AuthRequest defines the field as 'id'
    const stores = await Store.find({ ownerId: req.user!.id })
      .populate('category', 'name slug icon')
      .populate('city',     'name slug country state')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: stores.length, data: stores });
  } catch (err) {
    next(err);
  }
};

// ── POST /stores ──────────────────────────────────────────────────────────────
export const createStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name, description,
      category: categoryId, city: cityId,
      address, coordinates,
      phone, email, website,
      logo, coverImage,
      openingHours, preparationTime, deliveryRadius, minimumOrder, deliveryFee,
    } = req.body;

    const [city, category] = await Promise.all([
      City.findById(cityId),
      Category.findById(categoryId),
    ]);

    if (!city || !city.isActive)         throw new AppError('City not found or is not currently active', 422);
    if (!category || !category.isActive) throw new AppError('Category not found or is not currently active', 422);

    const store = await Store.create({
      name,
      description,
      category: categoryId,
      city: cityId,
      ownerId: req.user!.id,   // ✅ Fixed: was req.user!.userId
      address,
      coordinates,
      phone,
      email,
      website,
      logo,
      coverImage,
      openingHours,
      preparationTime,
      deliveryRadius,
      minimumOrder,
      deliveryFee,
      status: req.user!.role === 'admin' ? 'active' : 'pending',
    });

    await store.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'city',     select: 'name slug country state' },
    ]);

    res.status(201).json({ success: true, message: 'Store created successfully', data: store });
  } catch (err) {
    next(err);
  }
};

// ── PUT /stores/:id ───────────────────────────────────────────────────────────
export const updateStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);

    // ✅ Fixed: was req.user!.userId
    if (req.user!.role !== 'admin' && store.ownerId !== req.user!.id) {
      throw new AppError('You do not own this store', 403);
    }

    const updatableFields = [
      'name', 'description', 'phone', 'email', 'website',
      'logo', 'coverImage', 'address', 'coordinates',
      'openingHours', 'preparationTime', 'deliveryRadius',
      'minimumOrder', 'deliveryFee',
    ] as const;

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) (store as any)[field] = req.body[field];
    });

    if (req.body.category && req.body.category !== String(store.category)) {
      const cat = await Category.findById(req.body.category);
      if (!cat || !cat.isActive) throw new AppError('Invalid or inactive category', 422);
      store.category = req.body.category;
    }

    if (req.body.city && req.body.city !== String(store.city)) {
      const city = await City.findById(req.body.city);
      if (!city || !city.isActive) throw new AppError('Invalid or inactive city', 422);
      store.city = req.body.city;
    }

    if (req.user!.role === 'admin') {
      if (req.body.status     !== undefined) store.status     = req.body.status;
      if (req.body.isVerified !== undefined) store.isVerified = req.body.isVerified;
      if (req.body.isFeatured !== undefined) store.isFeatured = req.body.isFeatured;
    }

    await store.save();
    await store.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'city',     select: 'name slug country state' },
    ]);

    res.json({ success: true, message: 'Store updated', data: store });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /stores/:id/status ──────────────────────────────────────────────────
export const updateStoreStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    ).populate('category', 'name slug icon').populate('city', 'name slug country state');

    if (!store) throw new AppError('Store not found', 404);

    res.json({ success: true, message: `Store status updated to ${req.body.status}`, data: store });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /stores/:id ────────────────────────────────────────────────────────
export const deleteStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) throw new AppError('Store not found', 404);

    // ✅ Fixed: was req.user!.userId
    if (req.user!.role !== 'admin' && store.ownerId !== req.user!.id) {
      throw new AppError('You do not own this store', 403);
    }

    await Store.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Store deleted' });
  } catch (err) {
    next(err);
  }
};