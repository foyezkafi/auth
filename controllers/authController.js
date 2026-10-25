const bcrypt = require("bcrypt");
const userModel = require("../models/userSchema");
const sendEmail = require("../helpers/sendEmail");
const { verificationEmail, resetPasswordEmail, resultPage } = require("../helpers/emailTemplates");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateEmailToken,
  hashToken,
  tokenExpiresAt,
  ACCESS_EXPIRES,
  REFRESH_EXPIRES,
} = require("../helpers/tokenHelper");

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  profilepicture: user.profilepicture,
  address: user.address,
  phone: user.phone,
  gender: user.gender,
  dob: user.dob,
  isVerified: user.isVerified,
  role: user.role
});

const appBaseUrl = () => {
  return process.env.SERVER_URL || `http://localhost:${process.env.PORT || 8000}`;
};

const apiPrefix = process.env.BASE_URL || "/api/v1";

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sendVerificationMail = async (user, rawToken) => {
  const verifyUrl = `${appBaseUrl()}${apiPrefix}/auth/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: verificationEmail({ username: user.username, verifyUrl }),
  });
};

const sendResetMail = async (user, rawToken) => {
  const resetUrl = `${appBaseUrl()}${apiPrefix}/auth/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: resetPasswordEmail({ username: user.username, resetUrl }),
  });
};

const registrationController = async (req, res) => {
  try {
    const { username, email, password, profilepicture, address, phone, gender, dob, role } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Please enter a username" });
    }
    if (username.length > 16) {
      return res.status(400).json({ success: false, message: "Username max length is 16" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Please enter an email" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Please enter a password" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (!gender) {
      return res.status(400).json({ success: false, message: "Please select your gender" });
    }

    const existingUser = await userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 12);
    const { token, hashedToken } = generateEmailToken();

    const user = await userModel.create({
      username,
      email: email.toLowerCase(),
      password: hashedPass,
      profilepicture,
      address,
      phone,
      gender,
      dob,
      role,
      isVerified: false,
      verificationToken: hashedToken,
      verificationTokenExpires: tokenExpiresAt(24 * 60),
    });

    try {
      await sendVerificationMail(user, token);
    } catch (mailError) {
      return res.status(201).json({
        success: true,
        message: "Account created, but verification email could not be sent. Use resend verification.",
        data: publicUser(user),
        emailError: mailError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
      data: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() }).select("+password +refreshToken");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    const payload = { id: user._id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES,
      refreshExpiresIn: REFRESH_EXPIRES,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const logoutController = async (req, res) => {
  try {
    await userModel.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.clearCookie("refreshToken");
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const verifyEmailController = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      if (req.accepts("html")) {
        return res.status(400).send(resultPage({
          success: false,
          title: "Invalid link",
          message: "Verification token is missing.",
        }));
      }
      return res.status(400).json({ success: false, message: "Verification token is required" });
    }

    const hashed = hashToken(token);
    const user = await userModel.findOne({
      verificationToken: hashed,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      if (req.accepts("html")) {
        return res.status(400).send(resultPage({
          success: false,
          title: "Link expired",
          message: "This verification link is invalid or has expired. Please request a new one.",
        }));
      }
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    if (req.accepts("html")) {
      return res.status(200).send(resultPage({
        success: true,
        title: "Email verified",
        message: "Your account is now active. You can close this tab and log in to the ERP system.",
      }));
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resendVerificationController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a verification email has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const { token, hashedToken } = generateEmailToken();
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = tokenExpiresAt(24 * 60);
    await user.save();
    await sendVerificationMail(user, token);

    return res.status(200).json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a password reset link has been sent.",
      });
    }

    const { token, hashedToken } = generateEmailToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiresAt(15);
    await user.save();
    await sendResetMail(user, token);

    return res.status(200).json({
      success: true,
      message: "If this email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resetPasswordPageController = async (req, res) => {
  const { token } = req.params;
  const hashed = hashToken(token);
  const user = await userModel.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).send(resultPage({
      success: false,
      title: "Link expired",
      message: "This password reset link is invalid or has expired.",
    }));
  }

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset password</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <form method="POST" action="${apiPrefix}/auth/reset-password/${token}" style="width:min(420px,92%);background:#111827;border:1px solid #1f2937;border-radius:20px;padding:32px 28px;">
    <p style="margin:0 0 8px;color:#38bdf8;letter-spacing:1px;text-transform:uppercase;font-size:12px;">${process.env.APP_NAME || "ERP System"}</p>
    <h1 style="margin:0 0 8px;font-size:24px;">Create a new password</h1>
    <p style="margin:0 0 20px;color:#9ca3af;font-size:14px;">Choose a strong password with at least 6 characters.</p>
    <label style="display:block;margin-bottom:8px;font-size:13px;">New password</label>
    <input name="password" type="password" minlength="6" required style="width:100%;box-sizing:border-box;margin-bottom:14px;padding:12px 14px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#fff;" />
    <label style="display:block;margin-bottom:8px;font-size:13px;">Confirm password</label>
    <input name="confirmPassword" type="password" minlength="6" required style="width:100%;box-sizing:border-box;margin-bottom:20px;padding:12px 14px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#fff;" />
    <button type="submit" style="width:100%;padding:12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;">Reset Password</button>
  </form>
</body>
</html>`);
};

const resetPasswordController = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "New password is required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (confirmPassword && confirmPassword !== password) {
      if (req.accepts("html") && !req.is("application/json")) {
        return res.status(400).send(resultPage({
          success: false,
          title: "Passwords do not match",
          message: "Please go back and enter the same password in both fields.",
        }));
      }
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const hashed = hashToken(token);
    const user = await userModel.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password +refreshToken");

    if (!user) {
      if (req.accepts("html") && !req.is("application/json")) {
        return res.status(400).send(resultPage({
          success: false,
          title: "Link expired",
          message: "This password reset link is invalid or has expired.",
        }));
      }
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    if (req.accepts("html") && !req.is("application/json")) {
      return res.send(resultPage({
        success: true,
        title: "Password updated",
        message: "Your password has been reset. You can now log in with your new password.",
      }));
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await userModel.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const payload = { id: user._id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

const getMeController = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: publicUser(req.user),
  });
};

module.exports = {
  registrationController,
  loginController,
  logoutController,
  verifyEmailController,
  resendVerificationController,
  forgotPasswordController,
  resetPasswordPageController,
  resetPasswordController,
  refreshTokenController,
  getMeController,
};
