import { prisma } from '../lib/prisma.js';

const hostSelect = { id: true, nickname: true, displayName: true };

export const listPendingTableInvites = async (userId: string) => {
  const seats = await prisma.privateTableSeat.findMany({
    where: { userId, status: 'INVITED' },
    include: {
      table: {
        include: {
          club: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { invitedAt: 'desc' },
    take: 10
  });

  const hostIds = [...new Set(seats.map((s) => s.table.hostUserId))];
  const hosts = await prisma.user.findMany({
    where: { id: { in: hostIds } },
    select: hostSelect
  });
  const hostMap = new Map(hosts.map((h) => [h.id, h]));

  return seats.map((seat) => ({
    id: seat.id,
    clubId: seat.table.clubId,
    tableId: seat.tableId,
    tableName: seat.table.name,
    clubName: seat.table.club.name,
    mode: seat.table.mode,
    virtualBuyIn: seat.table.virtualBuyIn,
    inviteCode: seat.table.inviteCode,
    host: hostMap.get(seat.table.hostUserId) ?? {
      id: seat.table.hostUserId,
      nickname: 'host',
      displayName: 'Host'
    }
  }));
};

export const listLiveTableInvites = async (userId: string) => {
  const seats = await prisma.privateTableSeat.findMany({
    where: {
      userId,
      status: { in: ['ACCEPTED', 'SEATED'] },
      table: { status: 'LIVE', sessionId: { not: null } }
    },
    include: {
      table: {
        include: {
          club: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { invitedAt: 'desc' },
    take: 5
  });

  const hostIds = [...new Set(seats.map((s) => s.table.hostUserId))];
  const hosts = await prisma.user.findMany({
    where: { id: { in: hostIds } },
    select: hostSelect
  });
  const hostMap = new Map(hosts.map((h) => [h.id, h]));

  return seats
    .filter((s) => s.table.sessionId)
    .map((seat) => ({
      clubId: seat.table.clubId,
      tableId: seat.tableId,
      sessionId: seat.table.sessionId!,
      tableName: seat.table.name,
      mode: seat.table.mode,
      buyIn: seat.table.virtualBuyIn,
      host: hostMap.get(seat.table.hostUserId) ?? {
        id: seat.table.hostUserId,
        nickname: 'host',
        displayName: 'Host'
      }
    }));
};
