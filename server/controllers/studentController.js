const User = require('../models/User');

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        rollNumber: user.rollNumber,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student profile.'
    });
  }
}

module.exports = {
  getProfile
};
