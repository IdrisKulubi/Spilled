import { pgTable, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved", 
  "rejected",
]);

export const idTypeEnum = pgEnum("id_type", [
  "school_id",
  "national_id",
]);

export const tagTypeEnum = pgEnum("tag_type", [
  "red_flag",
  "good_vibes", 
  "unsure",
]);

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone"),
  email: text("email"),
  nickname: text("nickname"),
  verified: boolean("verified").default(false),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  idImageUrl: text("id_image_url"),
  idType: idTypeEnum("id_type"),
  rejectionReason: text("rejection_reason"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guys table
export const guys = pgTable("guys", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  phone: text("phone"),
  socials: text("socials"),
  location: text("location"),
  age: integer("age"),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stories table
export const stories = pgTable("stories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  guyId: text("guy_id").references(() => guys.id),
  userId: text("user_id").references(() => users.id),
  text: text("text"),
  tags: tagTypeEnum("tags").array(),
  imageUrl: text("image_url"),
  anonymous: boolean("anonymous").default(false),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: text("story_id").references(() => stories.id),
  userId: text("user_id").references(() => users.id),
  text: text("text"),
  anonymous: boolean("anonymous").default(false),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: text("sender_id").references(() => users.id),
  receiverId: text("receiver_id").references(() => users.id),
  text: text("text"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Guy = typeof guys.$inferSelect;
export type InsertGuy = typeof guys.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type InsertStory = typeof stories.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;