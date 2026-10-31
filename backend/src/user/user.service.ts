import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as argon from "argon2";
import * as crypto from "crypto";
import { Entry } from "ldapts";
import { AuthSignInDTO } from "src/auth/dto/authSignIn.dto";
import { EmailService } from "src/email/email.service";
import { PrismaService } from "src/prisma/prisma.service";
import { inspect } from "util";
import { ConfigService } from "../config/config.service";
import { FileService } from "../file/file.service";
import { CreateUserDTO } from "./dto/createUser.dto";
import { UpdateUserDto } from "./dto/updateUser.dto";
import { UcaCoreService } from "../uca/uca-core.service";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private fileService: FileService,
    private configService: ConfigService,
    private uca: UcaCoreService,
  ) {}

  async list() {
    return await this.prisma.user.findMany();
  }

  async get(id: string) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async create(dto: CreateUserDTO) {
    let hash: string;

    // The password can be undefined if the user is invited by an admin
    if (!dto.password) {
      const randomPassword = crypto.randomUUID();
      hash = await argon.hash(randomPassword);
      await this.emailService.sendInviteEmail(dto.email, randomPassword);
    } else {
      hash = await argon.hash(dto.password);
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          ...dto,
          password: hash,
        },
      });
      this.uca.syncUser(created);
      return created;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedField: string = e.meta.target[0];
          throw new BadRequestException(
            `A user with this ${duplicatedField} already exists`,
          );
        }
      }
    }
  }

  async update(id: string, user: UpdateUserDto) {
    try {
      const hash = user.password && (await argon.hash(user.password));
      const before = await this.prisma.user.findUnique({ where: { id } });

      const updated = await this.prisma.user.update({
        where: { id },
        data: { ...user, password: hash },
      });
      // the UCA ID hub knows people by email: a new email = the old record goes, the new one comes
      if (before && updated && before.email.toLowerCase() !== updated.email.toLowerCase()) {
        this.uca.syncUser(before, true);
        this.uca.syncUser(updated);
      }
      return updated;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedField: string = e.meta.target[0];
          throw new BadRequestException(
            `A user with this ${duplicatedField} already exists`,
          );
        }
      }
    }
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { shares: true },
    });
    if (!user) throw new BadRequestException("User not found");

    if (user.isAdmin) {
      const userCount = await this.prisma.user.count({
        where: { isAdmin: true },
      });

      if (userCount === 1) {
        throw new BadRequestException("Cannot delete the last admin user");
      }
    }

    await Promise.all(
      user.shares.map((share) => this.fileService.deleteAllFiles(share.id)),
    );

    const deleted = await this.prisma.user.delete({ where: { id } });
    this.uca.syncUser(deleted, true);
    return deleted;
  }

  async findOrCreateFromLDAP(
    providedCredentials: AuthSignInDTO,
    ldapEntry: Entry,
  ) {
    const fieldNameMemberOf = this.configService.get("ldap.fieldNameMemberOf");
    const fieldNameEmail = this.configService.get("ldap.fieldNameEmail");

    let isAdmin = false;
    if (fieldNameMemberOf in ldapEntry) {
      const adminGroup = this.configService.get("ldap.adminGroups");
      const entryGroups = Array.isArray(ldapEntry[fieldNameMemberOf])
        ? ldapEntry[fieldNameMemberOf]
        : [ldapEntry[fieldNameMemberOf]];
      isAdmin = entryGroups.includes(adminGroup) ?? false;
    } else {
      this.logger.warn(
        `Trying to create/update a ldap user but the member field ${fieldNameMemberOf} is not present.`,
      );
    }

    let userEmail: string | null = null;
    if (fieldNameEmail in ldapEntry) {
      const value = Array.isArray(ldapEntry[fieldNameEmail])
        ? ldapEntry[fieldNameEmail][0]
        : ldapEntry[fieldNameEmail];
      if (value) {
        userEmail = value.toString();
      }
    } else {
      this.logger.warn(
        `Trying to create/update a ldap user but the email field ${fieldNameEmail} is not present.`,
      );
    }

    if (providedCredentials.email) {
      /* if LDAP does not provides an users email address, take the user provided email address instead */
      userEmail = providedCredentials.email;
    }

    const randomId = crypto.randomUUID();
    const placeholderUsername = `ldap_user_${randomId}`;
    const placeholderEMail = `${randomId}@ldap.local`;

    try {
      const user = await this.prisma.user.upsert({
        create: {
          username: providedCredentials.username ?? placeholderUsername,
          email: userEmail ?? placeholderEMail,
          password: await argon.hash(crypto.randomUUID()),

          isAdmin,
          ldapDN: ldapEntry.dn,
        },
        update: {
          isAdmin,
          ldapDN: ldapEntry.dn,
        },
        where: {
          ldapDN: ldapEntry.dn,
        },
      });

      if (user.username === placeholderUsername) {
        /* Give the user a human readable name if the user has been created with a placeholder username */
        await this.prisma.user
          .update({
            where: {
              id: user.id,
            },
            data: {
              username: `user_${user.id}`,
            },
          })
          .then((newUser) => {
            user.username = newUser.username;
          })
          .catch((error) => {
            this.logger.warn(
              `Failed to update users ${user.id} placeholder username: ${inspect(error)}`,
            );
          });
      }

      if (userEmail && userEmail !== user.email) {
        /* Sync users email if it has changed */
        await this.prisma.user
          .update({
            where: {
              id: user.id,
            },
            data: {
              email: userEmail,
            },
          })
          .then((newUser) => {
            this.logger.log(
              `Updated users ${user.id} email from ldap from ${user.email} to ${userEmail}.`,
            );
            user.email = newUser.email;
          })
          .catch((error) => {
            this.logger.error(
              `Failed to update users ${user.id} email to ${userEmail}: ${inspect(error)}`,
            );
          });
      }

      return user;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedField: string = e.meta.target[0];
          throw new BadRequestException(
            `A user with this ${duplicatedField} already exists`,
          );
        }
      }
    }
  }
}
