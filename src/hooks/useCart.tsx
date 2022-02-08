import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = useCallback(async (productId: number) => {
    try {
      const { data: productStock } = await api
        .get<Stock>(`stock/${productId}`)
        .then(response => response)
        .catch(() => { throw new Error('Erro na adição do produto'); });

      const productCart = cart.find(cartItem => cartItem.id === productId);

      if (productCart) {
        if (productStock.amount === productCart.amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        productCart.amount += 1;

        setCart(state => {
          const newState = [
            ...state.map(product => product.id === productId ? productCart : product)
          ];

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

          return newState;
        });
      } else {
        const response = await api.get(`products/${productId}`);

        setCart(state => {
          const newState = [...state, { ...response.data, amount: 1 }];

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

          return newState;
        });
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message);
    }
  }, [cart]);

  const removeProduct = useCallback((productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error('Erro na remoção do produto');
      }

      setCart(state => {
        const newState = [...state.filter(product => product.id !== productId)];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

        return newState;
      });
    } catch (error) {
      toast.error(error instanceof Error && error.message);
    }
  }, [cart]);

  const updateProductAmount = useCallback(async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productCart = cart.find(product => product.id === productId);

      if (!productCart) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (!stock || amount < 1) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      if (stock.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      productCart.amount = amount;

      setCart(state => {
        const newState = [
          ...state.map(product => product.id === productId ? productCart : product)
        ];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

        return newState;
      });
    } catch (error) {
      toast.error(error instanceof Error && error.message);
    }
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
