import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Card, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import cowIcon from '../icons/cow.png';
import pigIcon from '../icons/pig.png';
import chickenIcon from '../icons/chicken.png';
import fishIcon from '../icons/fish.png';
import riceBowlIcon from '../icons/rice-bowl.png';
import potatoIcon from '../icons/potato.png';
import breadIcon from '../icons/bread.png';
import saladIcon from '../icons/salad.png';
import mincedMeatIcon from '../icons/minced-meat.png';
import pastaIcon from '../icons/pasta.png';
import cheeseIcon from '../icons/cheese.png';

interface IngredientsListProps {
  ingredients: string[];
  selectedIngredients: string[];
  updateIngredients: (date: string, ingredient?: string, isChecked?: boolean, cost?: number | null) => Promise<void>;
  date: string;
  usedBudget: number;
  currency: string;
  totalBudget: number;
}

const ingredientIcons: { [key: string]: React.ReactElement } = {
  'Beef': <img src={cowIcon} alt="Beef" className="w-8 h-8 object-contain" />,
  'Pork': <img src={pigIcon} alt="Pork" className="w-8 h-8 object-contain" />,
  'Chicken': <img src={chickenIcon} alt="Chicken" className="w-8 h-8 object-contain" />,
  'Fish': <img src={fishIcon} alt="Fish" className="w-8 h-8 object-contain" />,
  'Minced Meat': <img src={mincedMeatIcon} alt="Minced Meat" className="w-8 h-8 object-contain" />,
  'Rice': <img src={riceBowlIcon} alt="Rice" className="w-8 h-8 object-contain" />,
  'Potatoes': <img src={potatoIcon} alt="Potatoes" className="w-8 h-8 object-contain" />,
  'Pasta': <img src={pastaIcon} alt="Pasta" className="w-8 h-8 object-contain" />,
  'Bread': <img src={breadIcon} alt="Bread" className="w-8 h-8 object-contain" />,
  'Salad': <img src={saladIcon} alt="Salad" className="w-8 h-8 object-contain" />,
  'Cheese': <img src={cheeseIcon} alt="Cheese" className="w-8 h-8 object-contain" />,
};

const ToDo: React.FC<IngredientsListProps> = ({ ingredients, selectedIngredients, updateIngredients, date, usedBudget, currency, totalBudget }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [toggledIngredients, setToggledIngredients] = useState<{ [key: string]: boolean }>({});
  const [currentUsedBudget, setCurrentUsedBudget] = useState(usedBudget);

  const clearExpiredToggledIngredients = () => {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('toggledIngredientsDate');

    if (storedDate !== today) {
      localStorage.removeItem('toggledIngredients');
      localStorage.removeItem('toggledIngredientsDate');
      return null;
    }

    return localStorage.getItem('toggledIngredients');
  };

  useEffect(() => {
    const storedToggledIngredients = clearExpiredToggledIngredients();
    if (storedToggledIngredients) {
      setToggledIngredients(JSON.parse(storedToggledIngredients));
    } else {
      const initialToggledState = ingredients.reduce((acc, ingredient) => {
        acc[ingredient] = false;
        return acc;
      }, { Pay: false } as { [key: string]: boolean });
      setToggledIngredients(initialToggledState);
    }
  }, [ingredients]);

  const closePopover = () => {
    setIsPopupOpen(false);
  };

  const toggleIngredient = (ingredient: string) => {
    setToggledIngredients(prev => {
      const newState = {
        ...prev,
        [ingredient]: !prev[ingredient]
      };
      localStorage.setItem('toggledIngredients', JSON.stringify(newState));
      localStorage.setItem('toggledIngredientsDate', new Date().toISOString().split('T')[0]);
      return newState;
    });
  };

  return (
    <>
      <div className="space-y-2 mb-4">
        <Popover open={isPopupOpen} onOpenChange={setIsPopupOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsPopupOpen(true)}
            >
              Edit Ingredients
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[100vw] md:w-96 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="relative z-50 bg-white rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold leading-none">Ingredients</h4>
                <button
                  onClick={closePopover}
                  className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ['Beef', 'Pork', 'Chicken', 'Fish', 'Minced Meat'],
                  ['Rice', 'Potatoes', 'Pasta', 'Bread'],
                  ['Salad', 'Cheese']
                ].map((column, columnIndex) => (
                  <div key={columnIndex} className="space-y-2">
                    {column.map((ingredientName) => (
                      <div
                        key={ingredientName}
                        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors duration-200 ${ingredients.includes(ingredientName)
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-100'
                          }`}
                        onClick={() => {
                          updateIngredients(date, ingredientName, !ingredients.includes(ingredientName));
                        }}
                      >
                        <span className="w-10 h-10 flex items-center justify-center">
                          {ingredientIcons[ingredientName]}
                        </span>
                        <span>{ingredientName}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {ingredients.length > 0 ? (
          <>
            {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className={`flex items-center p-2 rounded-md ${toggledIngredients[ingredient] ? 'bg-blue-200' : 'bg-blue-100'
                } hover:bg-blue-200 transition-colors duration-200 w-full cursor-pointer`}
              onClick={() => toggleIngredient(ingredient)}
            >
              <span className="flex items-center justify-center me-2">
                {toggledIngredients[ingredient] ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </span>
              <span className="w-10 h-10 flex items-center justify-center mr-1">
                {ingredientIcons[ingredient]}
              </span>
              <div className="flex-grow">{ingredient}</div>
            </div>
            ))}
            <div
              className={`flex items-center p-2 rounded-md ${toggledIngredients['Pay'] ? 'bg-blue-200' : 'bg-blue-100'
                } hover:bg-blue-200 transition-colors duration-200 w-full cursor-pointer mt-4`}
              onClick={() => {
                const newPayState = !toggledIngredients['Pay'];
                toggleIngredient('Pay');
                if (newPayState) {
                  if (currentUsedBudget > 0) {
                    updateIngredients(date, undefined, undefined, currentUsedBudget);
                  }
                } else {
                  updateIngredients(date, undefined, undefined, null);
                  setCurrentUsedBudget(0);
                }
              }}
            >
              <span className="flex items-center justify-center me-2">
                {toggledIngredients['Pay'] ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </span>
              <div className="flex-grow flex items-center ml-1">
                <span className="mr-2">Used:</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentUsedBudget}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setCurrentUsedBudget(newValue === '' ? 0 : parseFloat(newValue));
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    const newUsedBudget = parseFloat(e.target.value);
                    if (!isNaN(newUsedBudget)) {
                      if (toggledIngredients['Pay']) {
                        updateIngredients(date, undefined, undefined, newUsedBudget);
                      } else {
                        setCurrentUsedBudget(newUsedBudget);
                      }
                    } else {
                      setCurrentUsedBudget(usedBudget);
                    }
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 text-right border-none bg-[#ffffffA0] focus:ring-0 text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    (e.target as HTMLInputElement).select();
                  }}
                />
                <span className="ml-2">/ {totalBudget} {currency}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-4 bg-gray-100 rounded-md w-full">
            <p className="text-gray-500">No ingredients added. Add some now!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ToDo;
