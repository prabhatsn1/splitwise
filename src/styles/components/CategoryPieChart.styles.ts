import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  chartContainer: {
    flex: 1,
  },
  barsContainer: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  categoryBar: {
    height: "100%",
    borderRadius: 10,
    minWidth: 4,
  },
  valueContainer: {
    width: 80,
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  categoryPercentage: {
    fontSize: 10,
    color: "#666",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 16,
    color: "#5bc5a7",
    fontWeight: "bold",
  },
});
