// src/modules/prisma/prisma.module.ts

import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
@Global() // dung goi cac modul khac
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule{}