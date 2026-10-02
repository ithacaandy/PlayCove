-- pg_net is used only by the private push dispatcher. Clients must not read its authentication headers.
revoke all on schema net from public,anon,authenticated;
revoke all on all tables in schema net from public,anon,authenticated;
revoke execute on all functions in schema net from public,anon,authenticated;
