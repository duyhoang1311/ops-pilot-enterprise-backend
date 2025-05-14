import { APIError, api } from "encore.dev/api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ping = api(
  { method: "GET", path: "/orgs/ping", expose: true },
  async () => {
    return { message: "pong" };
  }
);

// Organization represents an organization in the system
interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

// CreateOrganizationRequest represents the request body for creating an organization
interface CreateOrganizationRequest {
  name: string;
}

// CreateOrganizationResponse represents the response for creating an organization
interface CreateOrganizationResponse {
  organization: Organization;
}

// GetOrganizationResponse represents the response for getting organizations
interface GetOrganizationResponse {
  organizations: Organization[];
}

// CreateOrganization creates a new organization
export const createOrgs = api(
  {
    method: "POST",
    path: "/orgs/create",
    expose: true,
  },
  async (
    req: CreateOrganizationRequest
  ): Promise<CreateOrganizationResponse> => {
    const organization = await prisma.organization.create({
      data: {
        name: req.name,
      },
    });

    return { organization };
  }
);

export const getOrgs = api(
  {
    method: "GET",
    path: "/orgs/get",
    expose: true,
  },
  async (): Promise<GetOrganizationResponse> => {
    const organizations = await prisma.organization.findMany();
    return { organizations };
  }
);
