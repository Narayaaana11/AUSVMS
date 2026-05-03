const createError = require('http-errors');
const User = require('../models/User');

exports.createUser = async (req, res, next) => {
  try {
    const { username, name, email, password, role, department, designation, assignedGate, shift, joinDate } = req.body;
    if (!username || !name || !email || !password || !role) {
      return next(createError(400, 'Missing required fields'));
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return next(createError(409, 'Email or username already in use'));
    const user = await User.create({ username, name, email, password, role, department, designation, assignedGate, shift, joinDate });
    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        isActive: user.isActive,
        assignedGate: user.assignedGate,
        shift: user.shift,
        joinDate: user.joinDate
      },
      message: 'User created successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const {
      q,
      role,
      department,
      status, // 'active' | 'disabled'
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = { isDeleted: { $ne: true } }; // Exclude soft-deleted users
    if (q) {
      const regex = new RegExp(String(q), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { username: regex },
        { role: regex },
        { department: regex },
        { designation: regex },
      ];
    }
    if (role && role !== 'all') filter.role = role;
    if (department && department !== 'all') filter.department = department;
    if (status && (status === 'active' || status === 'disabled')) filter.isActive = status === 'active';

    const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
    const parsedSize = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 10));
    const skip = (parsedPage - 1) * parsedSize;

    const sort = { [String(sortBy)]: String(sortOrder).toLowerCase() === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      User.find(filter).select('-password').sort(sort).skip(skip).limit(parsedSize),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { items, total, page: parsedPage, pageSize: parsedSize },
      message: 'Users fetched successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!user) return next(createError(404, 'User not found'));
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, designation, isActive, assignedGate, shift, joinDate } = req.body;
    const update = { name, email, role, department, designation, isActive, assignedGate, shift, joinDate };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password');
    if (!user) return next(createError(404, 'User not found'));
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return next(createError(404, 'User not found'));
    user.isActive = !user.isActive;
    await user.save();
    res.json({ id: user._id, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) return next(createError(400, 'New password too short'));
    const user = await User.findById(id);
    if (!user) return next(createError(404, 'User not found'));
    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

// Get current user profile (for /users/me endpoint)
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return next(createError(404, 'User not found'));
    res.json({
      success: true,
      data: user,
      message: 'Profile loaded successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Update own user profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, phone, department, designation, employeeId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(employeeId && { employeeId }),
      },
      { new: true }
    ).select('-password');

    if (!user) return next(createError(404, 'User not found'));
    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Change password for current user
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError(400, 'Current password and new password are required'));
    }

    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'User not found'));

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(createError(401, 'Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Public: list staff/guards/admins for appointment booking or selection
exports.listStaffPublic = async (_req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'staff', 'guard', 'security'] }, isActive: true })
      .select('_id name email role department designation');
    res.json(staff);
  } catch (err) {
    next(err);
  }
};


