import pg from '../node_modules/pg/lib/index.js';

const { Client } = pg;

const connectionString = process.env.AUDIT_DATABASE_URL;

const client = new Client({
  connectionString,
  ssl: false,
});

const queries = {
  schemaTables: `
    select table_name
    from information_schema.tables
    where table_schema = 'restaurant_management'
    order by table_name
  `,
  roleCounts: `
    select rm.name as role_name, count(*)::int as count
    from users u
    join user_role ur on ur.user_id = u.id
    join role_master rm on rm.id = ur.role_id
    group by rm.name
    order by rm.name
  `,
  deliveryBoyLinks: `
    select
      u.id as user_id,
      u.name as user_name,
      u.phone as user_phone,
      u.is_active,
      rm.name as role_name,
      da.id as delivery_agent_id,
      da.user_id as linked_user_id,
      da.phone as agent_phone
    from users u
    join user_role ur on ur.user_id = u.id
    join role_master rm on rm.id = ur.role_id and lower(rm.name) = 'delivery_boy'
    left join delivery_agents da on da.user_id = u.id
    order by u.id
  `,
  unlinkedAgents: `
    select
      da.id as delivery_agent_id,
      da.user_id,
      da.name,
      da.phone,
      da.is_available
    from delivery_agents da
    where da.user_id is null
    order by da.id
  `,
  assignedDeliveries: `
    select
      d.id as delivery_id,
      d.order_id,
      d.agent_id,
      da.user_id as linked_user_id,
      da.phone as agent_phone,
      o.status as order_status,
      d.status as delivery_status
    from deliveries d
    left join delivery_agents da on da.id = d.agent_id
    join orders o on o.id = d.order_id
    where d.agent_id is not null
    order by d.id desc
    limit 50
  `,
  badAssignments: `
    select
      d.id as delivery_id,
      d.order_id,
      d.agent_id,
      da.user_id as linked_user_id,
      da.phone as agent_phone
    from deliveries d
    left join delivery_agents da on da.id = d.agent_id
    where d.agent_id is not null
      and (da.id is null or da.user_id is null)
    order by d.id desc
  `,
};

try {
  await client.connect();
  await client.query('set search_path to restaurant_management');

  const out = {};
  for (const [key, sql] of Object.entries(queries)) {
    try {
      const res = await client.query(sql);
      out[key] = res.rows;
    } catch (error) {
      out[key] = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  console.log(JSON.stringify(out, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => { });
}
