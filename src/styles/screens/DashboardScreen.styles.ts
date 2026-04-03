import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  contentContainer: {
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500",
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#5bc5a7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F8F3",
    justifyContent: "center",
    alignItems: "center",
  },

  // Balance Card
  balanceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: "#5bc5a7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceCardInner: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 24,
  },
  balanceBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  balanceBreakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 2,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  // Sections
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5bc5a7",
  },

  // Empty State
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },

  // Expense Items
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  expenseItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 18,
  },
  expenseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 3,
  },
  expenseMeta: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
  },
  expenseGroup: {
    fontSize: 13,
    color: "#5bc5a7",
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  expenseAmount: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
  },
  amountSubtext: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Group Items
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  groupItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 18,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8F8F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 3,
  },
  groupMembers: {
    fontSize: 13,
    color: "#94A3B8",
  },
});
