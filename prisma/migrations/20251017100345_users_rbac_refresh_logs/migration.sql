/*
  Warnings:

  - You are about to alter the column `entityType` on the `activitylog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.
  - You are about to alter the column `action` on the `activitylog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.
  - You are about to drop the `address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `automation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clientcontact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clientstatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoiceitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoicestatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leadsource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leadstatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leadstatushistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `paymentmethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projectmember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projectstage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projectstatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tagging` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `taskcomment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `taskpriority` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `taskstatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `timeentry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vendor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhook` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `ActivityLog_actorUserId_fkey` ON `activitylog`;

-- AlterTable
ALTER TABLE `activitylog` ADD COLUMN `ip` VARCHAR(64) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    MODIFY `entityType` VARCHAR(64) NOT NULL,
    MODIFY `entityId` BIGINT NULL,
    MODIFY `action` VARCHAR(64) NOT NULL;

-- DropTable
DROP TABLE `address`;

-- DropTable
DROP TABLE `attachment`;

-- DropTable
DROP TABLE `automation`;

-- DropTable
DROP TABLE `client`;

-- DropTable
DROP TABLE `clientcontact`;

-- DropTable
DROP TABLE `clientstatus`;

-- DropTable
DROP TABLE `document`;

-- DropTable
DROP TABLE `expense`;

-- DropTable
DROP TABLE `invoice`;

-- DropTable
DROP TABLE `invoiceitem`;

-- DropTable
DROP TABLE `invoicestatus`;

-- DropTable
DROP TABLE `lead`;

-- DropTable
DROP TABLE `leadsource`;

-- DropTable
DROP TABLE `leadstatus`;

-- DropTable
DROP TABLE `leadstatushistory`;

-- DropTable
DROP TABLE `notification`;

-- DropTable
DROP TABLE `payment`;

-- DropTable
DROP TABLE `paymentmethod`;

-- DropTable
DROP TABLE `project`;

-- DropTable
DROP TABLE `projectmember`;

-- DropTable
DROP TABLE `projectstage`;

-- DropTable
DROP TABLE `projectstatus`;

-- DropTable
DROP TABLE `tag`;

-- DropTable
DROP TABLE `tagging`;

-- DropTable
DROP TABLE `task`;

-- DropTable
DROP TABLE `taskcomment`;

-- DropTable
DROP TABLE `taskpriority`;

-- DropTable
DROP TABLE `taskstatus`;

-- DropTable
DROP TABLE `template`;

-- DropTable
DROP TABLE `timeentry`;

-- DropTable
DROP TABLE `vendor`;

-- DropTable
DROP TABLE `webhook`;

-- CreateIndex
CREATE INDEX `ActivityLog_createdAt_idx` ON `ActivityLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `RefreshToken_expiresAt_idx` ON `RefreshToken`(`expiresAt`);

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `rolepermission` RENAME INDEX `RolePermission_permissionId_fkey` TO `RolePermission_permissionId_idx`;

-- RenameIndex
ALTER TABLE `userrole` RENAME INDEX `UserRole_roleId_fkey` TO `UserRole_roleId_idx`;
