import { supabase } from './createClient';

export const calculateWashingCost = async (washingCount: number, dryingCount: number): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('budget_per_laundry')
      .single();

    if (error) {
      console.error('Error fetching budget_per_laundry:', error);
      return 1; // Return 1 in case of error to avoid null values
    }

    const costPerLaundry = data?.budget_per_laundry || 1; // Default to 1 if budget_per_laundry is not set
    const totalCost = (washingCount + dryingCount) * costPerLaundry;
    return Math.max(1, Math.round(totalCost * 100) / 100); // Ensure the cost is at least 1
  } catch (error) {
    console.error('Error in calculateWashingCost:', error);
    return 1; // Return 1 in case of any unexpected error
  }
};
