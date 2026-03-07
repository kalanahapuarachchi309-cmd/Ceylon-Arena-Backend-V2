import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import User, { UserAccountStatus } from "../models/User";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary";
import Payment, { PaymentMethod, PaymentStatus } from "../models/Payment";

const ACCESS_TOKEN_EXPIRE = "15m";
const REFRESH_TOKEN_EXPIRE = "7d";

export const register = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { playerName, email, phone, promoCode, leaderAddress, password, game, gameId, teamName, player2Name, player2GameId, player3Name, player3GameId, player4Name, player4GameId } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      playerName,
      email,
      phone,
      promoCode,
      address: leaderAddress,
      password: hashedPassword,
      accountStatus: UserAccountStatus.PENDING,
      games: [{ game, gameId, teamName, player2Name, player2GameId, player3Name, player3GameId, player4Name, player4GameId }]
    });

    res.status(201).json({ message: "User registered successfully", data: { id: user._id, playerName: user.playerName, email: user.email, role: user.role, accountStatus: user.accountStatus } });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const registerWithBankPayment = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      playerName,
      email,
      phone,
      promoCode,
      leaderAddress,
      password,
      game,
      gameId,
      teamName,
      player2Name,
      player2GameId,
      player3Name,
      player3GameId,
      player4Name,
      player4GameId,

      amount,
      bankName,
      accountHolder,
      accountNumber,
      ifscCode,
      transactionId
    } = req.body;

    if (!req.file) {
      throw new Error("Payment slip required");
    }

    // 1️⃣ Check existing user
    const exists = await User.findOne({ email }).session(session);
    if (exists) {
      throw new Error("Email already registered");
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Upload slip to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "payment_slips"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    
      stream.end(req.file!.buffer);
    });

    // 4️⃣ Create user (inside transaction)
    const user = await User.create([{
      playerName,
      email,
      phone,
      promoCode,
      address: leaderAddress,
      password: hashedPassword,
      accountStatus: UserAccountStatus.PENDING,
      games: [{
        game,
        gameId,
        teamName,
        player2Name,
        player2GameId,
        player3Name,
        player3GameId,
        player4Name,
        player4GameId
      }]
    }], { session });

    // 5️⃣ Create payment (inside transaction)
    const payment = await Payment.create([{
      userId: user[0]._id,
      amount,
      paymentMethod: PaymentMethod.BANK,
      status: PaymentStatus.PENDING,
      bankName,
      accountHolder,
      accountNumber,
      ifscCode,
      transactionId,
      slipFilePath: uploadResult.secure_url
    }], { session });

    // 6️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Registration and payment submitted successfully",
      data: {
        userId: user[0]._id,
        paymentId: payment[0]._id
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message || "Transaction failed"
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: ACCESS_TOKEN_EXPIRE });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: REFRESH_TOKEN_EXPIRE });

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        playerName: user.playerName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const user = await User.findOne({ refreshToken: token });
    if (!user) return res.status(403).json({ message: "Invalid refresh token" });

    // Use jwt.verify synchronously and type the payload
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
    } catch (err) {
      return res.status(403).json({ message: "Token expired or invalid" });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = "";
      await user.save();
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
