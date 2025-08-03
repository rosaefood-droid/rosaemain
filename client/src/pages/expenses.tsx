import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, IndianRupee, Calendar, Tag, Download, Printer } from "lucide-react";
import { insertExpenseSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance", 
  "Staff Salaries",
  "Equipment",
  "Marketing",
  "Rent",
  "Supplies",
  "Insurance",
  "Other"
];

export default function Expenses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const { data: expenses, isLoading: isExpensesLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsExpenseModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createExpenseMutation.mutate(data);
  };

  const handleExport = async (category?: string) => {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await fetch(`/api/expenses/export${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses${category ? `_${category}` : ''}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Expenses exported successfully",
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to export expenses",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Calculate total expenses
  const totalExpenses = expenses?.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0) || 0;

  // Group expenses by category
  const expensesByCategory = expenses?.reduce((acc: any, expense: any) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += Number(expense.amount);
    return acc;
  }, {}) || {};

  return (
    <div className="flex min-h-screen bg-rosae-black">
      <Sidebar />
      <div className="flex-1">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-page-title">Expense Management</h2>
            <p className="text-gray-400">Track and manage all business expenses</p>
          </div>
          <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-rosae-red hover:bg-rosae-dark-red px-6 py-2"
                data-testid="button-new-expense"
              >
                <Plus className="mr-2 w-4 h-4" />
                New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-rosae-dark-gray border-gray-600 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white">Add New Expense</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              {EXPENSE_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="1000"
                              className="bg-gray-800 border-gray-600 text-white"
                              data-testid="input-amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Expense Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-gray-800 border-gray-600 text-white"
                            data-testid="input-expense-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the expense..."
                            className="bg-gray-800 border-gray-600 text-white resize-none"
                            rows={3}
                            data-testid="textarea-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsExpenseModalOpen(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      data-testid="button-cancel-expense"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createExpenseMutation.isPending}
                      className="bg-rosae-red hover:bg-rosae-dark-red"
                      data-testid="button-save-expense"
                    >
                      {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Expenses</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-total-expenses">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-rosae-red/20 rounded-lg flex items-center justify-center">
                  <IndianRupee className="text-rosae-red text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Categories</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-categories-count">
                    {Object.keys(expensesByCategory).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Tag className="text-blue-400 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Entries</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-total-entries">
                    {expenses?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="text-green-400 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-6" data-testid="text-expenses-list-title">All Expenses</h3>
            {isExpensesLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Loading expenses...
              </div>
            ) : expenses && expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-600">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {expenses.map((expense: any) => (
                      <tr key={expense.id} className="border-b border-gray-700 hover:bg-gray-800/50" data-testid={`row-expense-${expense.id}`}>
                        <td className="py-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(expense.expenseDate)}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-4 text-gray-300 max-w-xs truncate">{expense.description}</td>
                        <td className="py-4 font-semibold">
                          <div className="flex items-center text-rosae-red">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            {formatCurrency(Number(expense.amount))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <IndianRupee className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Expenses Found</h3>
                <p className="text-gray-400 mb-6">Start by recording your first expense</p>
                <Button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-rosae-red hover:bg-rosae-dark-red"
                  data-testid="button-create-first-expense"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add First Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
