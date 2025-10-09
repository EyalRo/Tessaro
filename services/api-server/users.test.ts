import {
  closeDatabase,
  countOrganizations,
  countServices,
  countUsers,
  createOrganization,
  createService,
  createUser,
  deleteOrganization,
  deleteService,
  deleteUser,
  getOrganizationById,
  getServiceById,
  getUserById,
  listOrganizations,
  listServices,
  listUsers,
  updateOrganization,
  updateService,
  updateUser,
} from "./storage/denodb.ts";
import { closeKv, getValue, incrementCounter, setValue } from "./storage/kv.ts";
import { assertEquals, assertExists } from "std/assert";

denoTest("user storage integrates denodb and Deno KV", async () => {
  const tempDir = await Deno.makeTempDir();
  const previousSqlitePath = Deno.env.get("SQLITE_PATH");
  const previousKvPath = Deno.env.get("DENO_KV_PATH");

  try {
    const sqlitePath = `${tempDir}/admin.sqlite`;
    const kvPath = `${tempDir}/kv.sqlite`;

    Deno.env.set("SQLITE_PATH", sqlitePath);
    Deno.env.set("DENO_KV_PATH", kvPath);

    await closeDatabase();
    await closeKv();

    assertEquals(await countUsers(), 0);

    const user = await createUser({
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      avatar_url: null,
    });

    assertExists(user.id);
    assertEquals(user.email, "test@example.com");

    const users = await listUsers();
    assertEquals(users.length, 1);

    const fetched = await getUserById(user.id);
    assertExists(fetched);
    assertEquals(fetched?.id, user.id);

    const updated = await updateUser(user.id, { name: "Updated User" });
    assertExists(updated);
    assertEquals(updated?.name, "Updated User");

    assertEquals(await countUsers(), 1);

    const hits = await incrementCounter(["metrics", "test", "hits"]);
    assertEquals(hits, 1);

    await setValue(["metrics", "test", "last"], "now");
    const metric = await getValue<string>(["metrics", "test", "last"]);
    assertEquals(metric, "now");

    const deleted = await deleteUser(user.id);
    assertEquals(deleted, true);
    assertEquals(await countUsers(), 0);

    const organization = await createOrganization({
      name: "Atlas Labs",
      plan: "Enterprise",
      status: "Active",
    });

    const secondOrganization = await createOrganization({
      name: "Compass Group",
      plan: "Growth",
      status: "Active",
    });

    assertExists(organization.id);
    assertExists(secondOrganization.id);
    const organizations = await listOrganizations();
    assertEquals(organizations.length, 2);

    const fetchedOrganization = await getOrganizationById(organization.id);
    assertExists(fetchedOrganization);
    assertEquals(fetchedOrganization?.name, "Atlas Labs");

    const updatedOrganization = await updateOrganization(organization.id, {
      status: "Suspended",
    });
    assertExists(updatedOrganization);
    assertEquals(updatedOrganization?.status, "Suspended");
    assertEquals(await countOrganizations(), 2);

    const userWithOrganizations = await createUser({
      name: "Org User",
      email: "org-user@example.com",
      role: "manager",
      avatar_url: null,
      organization_ids: [organization.id, secondOrganization.id],
    });

    assertExists(userWithOrganizations);
    assertEquals(userWithOrganizations.organizations.length, 2);

    const usersWithAssociations = await listUsers();
    const storedUser = usersWithAssociations.find((item) =>
      item.id === userWithOrganizations.id
    );
    assertExists(storedUser);
    assertEquals(storedUser?.organizations.length, 2);

    const updatedUserOrganizations = await updateUser(
      userWithOrganizations.id,
      {
        organization_ids: [secondOrganization.id],
      },
    );
    assertExists(updatedUserOrganizations);
    assertEquals(updatedUserOrganizations?.organizations.length, 1);
    assertEquals(
      updatedUserOrganizations?.organizations[0].id,
      secondOrganization.id,
    );

    const clearedUserOrganizations = await updateUser(
      userWithOrganizations.id,
      {
        organization_ids: [],
      },
    );
    assertExists(clearedUserOrganizations);
    assertEquals(clearedUserOrganizations?.organizations.length, 0);

    const removedAssociatedUser = await deleteUser(userWithOrganizations.id);
    assertEquals(removedAssociatedUser, true);

    const removedOrganization = await deleteOrganization(organization.id);
    assertEquals(removedOrganization, true);
    assertEquals(await countOrganizations(), 1);

    const removedSecondOrganization = await deleteOrganization(
      secondOrganization.id,
    );
    assertEquals(removedSecondOrganization, true);
    assertEquals(await countOrganizations(), 0);

    const service = await createService({
      name: "Billing Pipeline",
      service_type: "Finance",
      status: "Active",
      organization_count: 2,
    });

    assertExists(service.id);
    assertEquals(service.organization_count, 2);

    const services = await listServices();
    assertEquals(services.length, 1);

    const fetchedService = await getServiceById(service.id);
    assertExists(fetchedService);
    assertEquals(fetchedService?.service_type, "Finance");

    const updatedService = await updateService(service.id, {
      status: "Maintenance",
      organization_count: 3,
    });
    assertExists(updatedService);
    assertEquals(updatedService?.status, "Maintenance");
    assertEquals(updatedService?.organization_count, 3);
    assertEquals(await countServices(), 1);

    const removedService = await deleteService(service.id);
    assertEquals(removedService, true);
    assertEquals(await countServices(), 0);
  } finally {
    await closeDatabase();
    await closeKv();

    if (previousSqlitePath === undefined) {
      Deno.env.delete("SQLITE_PATH");
    } else {
      Deno.env.set("SQLITE_PATH", previousSqlitePath);
    }

    if (previousKvPath === undefined) {
      Deno.env.delete("DENO_KV_PATH");
    } else {
      Deno.env.set("DENO_KV_PATH", previousKvPath);
    }

    await Deno.remove(tempDir, { recursive: true });
  }
});

function denoTest(name: string, fn: () => Promise<void>) {
  Deno.test({
    name,
    fn,
    permissions: {
      env: true,
      read: true,
      write: true,
      run: false,
      net: false,
      ffi: false,
    },
  });
}
