import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const hasProductCart: Product[] = cart.filter((produto) => {
        return productId === produto.id;
      });
      if (hasProductCart.length > 0) {
        updateProductAmount({
          productId,
          amount: hasProductCart[0].amount + 1,
        });
        return;
      }

      await api.get("stock/" + productId).then((response) => {
        const stock: Stock = response.data;
        if (stock.amount > 0) {
          api.get("products/" + productId).then((response) => {
            const product: Product = response.data;
            if (!product.id) {
              return false;
            }
            setCart(() => {
              const newItem = { ...response.data, amount: 1 };
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify([...cart, newItem])
              );
              return [...cart, newItem];
            });
          });
        } else {
          toast.error("Quantidade solicitada fora de estoque");
          return false;
        }
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productCart = updatedCart.findIndex(
        (product) => product.id === productId
      );

      if (productCart >= 0) {
        updatedCart.slice(productCart, 1);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      await api.get("stock/" + productId).then((response) => {
        const stock: Stock = response.data;
        if (amount > stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          const updatedCart = cart.map((product: Product) =>
            product.id === productId ? { ...product, amount } : product
          );
          setCart(updatedCart);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );
        }
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };
  /** 
  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);
*/
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
