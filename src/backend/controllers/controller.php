<?php

namespace App\Controllers;

use App\Models\M_slideshow;
use App\Models\Store_Model;
use App\Models\Produk_Model;
use App\Models\Artikel_Model;
use App\Models\UserModel;
use App\Models\AddressModel;
use App\Models\Wilayah_Model;
use App\Models\Order_Model;
use App\Models\OngkirModel;
use App\Models\Stock_Model;
use App\Models\Midtrans_api_model;

class ShopCart extends BaseController
{
    protected $data_customer; 
	protected $data_alamat; 
	protected $data_order;  
	protected $data_stock;  
	protected $midtrans_api; 
	
	public function index()
	{
        helper(['form', 'url']);
        $cart = \Config\Services::cart();
        
		$model          = new M_slideshow();
        $data_store     = new Store_Model();
        $data_produk    = new Produk_Model();
        $data_shopbycategory = new Produk_Model();
        $deal_produk    = new Produk_Model();
        $data_artikel   = new Artikel_Model();
		
        $data = array(
    		'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
            'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
            'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
			'author'        => 'SWALT',
            'page1'         => 'Beranda',
            'componen'      => 'theme/kanza/halaman/beranda',
            'slideshow'     => $model->getSlideshow(),
            'data_store'    => $data_store->get_store(),
            'deal_produk'   => $deal_produk->get_product_deal(),
            // 'data_produk'   => $data_produk->get_produk(false,false,0),
            'data_shopbycategory'   =>  $data_shopbycategory,
            'data_artikel'  => $data_artikel->get_Artikel()
            // $data_shopbycategory->get_produk(75)
        );

        echo view('layout',$data);
		
	}

    public function cek_cart()
    {
        $cart = \Config\Services::cart();
        $response = $cart->contents();
        $data = json_encode($response);
        echo '<pre>';
            print_r($data);
        echo '</pre>';
    }

    public function add_cart()
    {
        // if (!$this->validate([
        //     'data_option' => [
        //         'rules'  => 'required',
        //         'errors' => [
        //             'required' => 'Pilihan Produk Harus ada'
        //         ]
        //     ]
        // ])) {
        //     session()->setFlashdata('error', $this->validator->listErrors());
        //     return redirect()->back()->withInput();
        // } else {
        
            $cart = \Config\Services::cart();
            $data_option= $this->request->getPost('data_option');
            $akhir = strpos($data_option, "*-*");
            $product_option_id = substr($data_option,0,$akhir);
            $name_option =substr($data_option,$akhir+3);
            $cart->insert(array(
                'id'    => $this->request->getPost('id').'-'.$product_option_id,
                'qty'   => $this->request->getVar('quantity'),
                'price' => $this->request->getPost('price'),
                'name'  => $this->request->getPost('name'),
                'options' => array(
                    'image'         => $this->request->getPost('image'),
                    'name_option'   => $name_option,
                    'reward'        => $this->request->getPost('points'),
                    'leader'        => $this->request->getVar('leader'),
                    'sc_pusat'      => $this->request->getVar('sc_pusat'),
                    'sku'           => $this->request->getVar('sku'),
                    'weight'        => $this->request->getVar('weight'),
                    'weight_class'  => $this->request->getVar('weight_class'),
                    'kirim'         => 0,    
                ) 
                ));
            // return redirect()->to(base_url()) ;   
            return redirect()->back();
        // }
    }

    public function clear_cart()
    {
        $cart = \Config\Services::cart();
        $cart->destroy();

    }


    public function update_item()
    {
        // Update an array of values belum digunakan
        $cart = \Config\Services::cart();
        
        $rowid   = $this->request->getVar('row_id');
        $qty     = $this->request->getVar('qty');
        
        $data = array(
                    'rowid' => $rowid,
                    'qty' => $qty
                );
        
        $cart->update($data);
        
        return redirect()->to(base_url().'/ShopCart/shop_cart'); 
        
    }

    public function remove_item()
    {
        $cart = \Config\Services::cart();    
        $row_id= $this->request->getVar('row_id');
        
        $cart->remove($row_id);
        return redirect()->back();
    }


    public function shop_cart()
    {
        helper(['form', 'url']);
        
        $customer_id = session()->get('customer_id');
        $store_id    = session()->get('store_id'); 
        
        $cart = \Config\Services::cart();
        $data_produk = new Produk_Model();
        $data_stock  = new Stock_Model();
        
        
        $agent = $this->request->getUserAgent();
        
        //--- cek ketersediaan barang di SC -------
        $keranjang = $cart->contents();
		$jumlah_ok = true ;
        
        foreach ($keranjang as $key => $value) {
			$data_id= $value['id'];
            $akhir  = strpos($data_id,"-");
            $id     = substr($data_id,0,$akhir);
            $qty    = $value['qty'];
            //--- cek stok ---- 
            $data_stock = $data_stock->get_produk_store($id,$store_id)->getRow();
            if($qty>$data_stock->jml){
                $jumlah_ok = false ;
            }
            
        }
        
        //--- EOF cek ketersediaan barang di SC -------
        
        if ($agent->isMobile()) {
        
            $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'jumlah_ok'     => $jumlah_ok,
                'componen'      => 'theme/mobile/halaman/shopping_cart'
            );
            
            echo view('layout_mobile',$data);
            
        } else {
        
            $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'jumlah_ok'     => $jumlah_ok,
                'componen'      => 'theme/desktop/halaman/shopping_cart'
            );
    
            echo view('layout_mobile',$data);
        }

    }

    public function checkout()
    {
        helper(['form', 'url']);
        
        $customer_id = session()->get('customer_id');
        $store_id    = session()->get('store_id'); 
        
        $cart = \Config\Services::cart();
        // $data_produk    = new Produk_Model();
        // $data_customer  = new UserModel();
        $data_store     = new Store_Model();
        $data_alamat    = new AddressModel();
        $data_ongkir    = new OngkirModel();
        $data_stock     = new Stock_Model();
        $data_stock1     = new Stock_Model();
        $data_stock2     = new Stock_Model();
        $data_stock3     = new Stock_Model();
        $data_wilayah   = new Wilayah_Model();
        $midtrans_api   = new Midtrans_api_model();
		
        $agent = $this->request->getUserAgent();
        
        if(is_null($data_alamat->get_address($customer_id,false)->getRow())){
            return redirect()->to(base_url('akun/address_list'));
        }
        
        //--- cek ketersediaan barang di SC -------
        $keranjang = $cart->contents();
		$jumlah_ok = true ;
        
        foreach ($keranjang as $key => $value) {
			$data_id= $value['id'];
            $akhir  = strpos($data_id,"-");
            $id     = substr($data_id,0,$akhir);
            $qty    = $value['qty'];
            //--- cek stok ---- 
            $data_stockx = $data_stock->get_produk_store($id,$store_id)->getRow();
            if($qty>$data_stockx->jml){
                $jumlah_ok = false ;
            }
            
        }
        
        
        
        if ($agent->isMobile()) {
        
            $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'componen'      => 'theme/mobile/halaman/checkout',
                'data_store'    => $data_store->find_store($store_id),
                'data_ongkir'   => $data_ongkir,
                'data_alamat'   => $data_alamat->get_address($customer_id,false),
                'data_stock'    => $data_stock,
                'data_stock1'   => $data_stock1,
                'data_stock2'   => $data_stock2,
                'data_stock3'   => $data_stock3,
                'jumlah_ok'     => $jumlah_ok,
                'midtrans_api'  => $midtrans_api->get_api()
            );
            
            echo view('layout_mobile',$data);
            
        } else {
        
            $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'componen'      => 'theme/desktop/halaman/checkout',
                'data_store'    => $data_store->find_store($store_id),
                'data_ongkir'   => $data_ongkir,
                'data_alamat'   => $data_alamat->get_address($customer_id,false),
                'data_stock'    => $data_stock,
                'data_stock1'   => $data_stock1,
                'data_stock2'   => $data_stock2,
                'data_stock3'   => $data_stock3,
                'jumlah_ok'     => $jumlah_ok,
                'midtrans_api'  => $midtrans_api->get_api()
            
                // $data_shopbycategory->get_produk(75)
            );
    
            echo view('layout_mobile',$data);
        }

    }
    
    public function confirm()
    {
        if (!$this->validate([
            
            'shipping_method' => [
                'rules'  => 'required',
                'errors' => [
                    'required' => 'Metode Pengiriman Harus dipilih'
                ]
            ]
        ])) {
            session()->setFlashdata('error', $this->validator->listErrors());
            return redirect()->back();
        } else {
        
            helper(['form', 'url']);
            $customer_id            = session()->get('customer_id');
            $payment_address_id     = $this->request->getVar('payment_address_id');
            $shipping_address_id    = $this->request->getVar('shipping_address_id');
            $shipping_city_id       = $this->request->getVar('shipping_city_id');
            $city_id                = $this->request->getVar('city_id');
            $postcode               = $this->request->getVar('postcode');
            $shipping_method        = $this->request->getVar('shipping_method');
            $payment_method         = $this->request->getVar('payment_method');
            $comment                = $this->request->getVar('comment');
            $pusat                  = $this->request->getVar('pusat');
            $store_id               = $this->request->getVar('store_id'); 
            $store_name             = $this->request->getVar('store_name');
            $mst_wilayah_id         = $this->request->getVar('mst_wilayah_id');
            
            $tariff_code            = $this->request->getVar('tariff_code'); 
            $code_origin            = $this->request->getVar('code_origin'); 
            $data_origin            = $this->request->getVar('data_origin'); 
            
            $client_key             = $this->request->getVar('client_key'); 
			$server_key             = $this->request->getVar('server_key'); 
			$merchant_id            = $this->request->getVar('merchant_id'); 
			$admin_fee              = $this->request->getVar('admin_fee'); 
			$environment            = $this->request->getVar('environment'); 
			$link_midtrans          = $this->request->getVar('link_midtrans'); 
			$status_midtrans        = $this->request->getVar('status_midtrans'); 
            
            $cart = \Config\Services::cart();
            // $data_produk = new Produk_Model();
            // $data_wilayah   = new Store_Model();
            $data_alamat    = new AddressModel();
            $data_wilayah   = new Wilayah_Model();
            $data_user      = new UserModel();
    		
    		$agent = $this->request->getUserAgent();
        
            if ($agent->isMobile()) {
                
                $data = array(
        			'title'         => 'CMS - SWALT',
                    'description'   => 'Aplikasi CMS - KanzaMall.com ',
                    'keywords'      => 'CMS,SWALT',
                    'author'        => 'SWALT',
                    'page1'         => 'Shopping Cart',
                    'componen'      => 'theme/mobile/halaman/confirm',
                    'city_id'               => $shipping_city_id,
                    'postcode'              => $postcode,
                    'pusat'                 => $pusat,
                    'store_id'              => $store_id,
                    'store_name'            => $store_name,
                    'mst_wilayah_id'        => $mst_wilayah_id,
                    'shipping_method'       => $shipping_method,
                    'payment_method'        => $payment_method,
                    'shipping_city_id'      => $shipping_city_id,
                    'payment_address_id'    => $payment_address_id,
                    'shipping_address_id'   => $shipping_address_id,
                    'tariff_code'           => $tariff_code,
                    'code_origin'           => $code_origin,
                    'data_origin'           => $data_origin,
                    'client_key'            => $client_key,
                    'client_key'            => $client_key,
                    'server_key'            => $server_key,
                    'merchant_id'           => $merchant_id,
                    'admin_fee'             => $admin_fee,
                    'environment'           => $environment,
                    'link_midtrans'         => $link_midtrans,
                    'status_midtrans'       => $status_midtrans,
                    'comment'       => $comment,
                    'customer_id'   => $customer_id,
                    'data_wilayah'  => $data_wilayah->cek_wilayah($shipping_city_id),
                    'data_alamat'   => $data_alamat->get_address($customer_id,$shipping_address_id),
                    'alamat_payment'=> $data_alamat->get_address($customer_id,$payment_address_id),
                    'data_user'     => $data_user->get_customer($customer_id)
                    // 'data_produk'   => $data_produk->get_produk(false,false,0),
                    // $data_shopbycategory->get_produk(75)
                );
                
                echo view('layout_mobile',$data);
                
            } else {    
            
                $data = array(
        			'title'         => 'CMS - SWALT',
                    'description'   => 'Aplikasi CMS - KanzaMall.com ',
                    'keywords'      => 'CMS,SWALT',
                    'author'        => 'SWALT',
                    'page1'         => 'Shopping Cart',
                    'componen'      => 'theme/kanza/halaman/confirm',
                    'city_id'               => $shipping_city_id,
                    'postcode'              => $postcode,
                    'pusat'                 => $pusat,
                    'store_id'              => $store_id,
                    'store_name'            => $store_name,
                    'mst_wilayah_id'        => $mst_wilayah_id,
                    'shipping_method'       => $shipping_method,
                    'payment_method'        => $payment_method,
                    'shipping_city_id'      => $shipping_city_id,
                    'payment_address_id'    => $payment_address_id,
                    'shipping_address_id'   => $shipping_address_id,
                    'tariff_code'           => $tariff_code,
                    'code_origin'           => $code_origin,
                    'data_origin'           => $data_origin,
                    'client_key'            => $client_key,
                    'client_key'            => $client_key,
                    'server_key'            => $server_key,
                    'merchant_id'           => $merchant_id,
                    'admin_fee'             => $admin_fee,
                    'environment'           => $environment,
                    'link_midtrans'         => $link_midtrans,
                    'status_midtrans'       => $status_midtrans,
                    'comment'       => $comment,
                    'customer_id'   => $customer_id,
                    'data_wilayah'  => $data_wilayah->cek_wilayah($shipping_city_id),
                    'data_alamat'   => $data_alamat->get_address($customer_id,$shipping_address_id),
                    'alamat_payment'=> $data_alamat->get_address($customer_id,$payment_address_id),
                    'data_user'     => $data_user->get_customer($customer_id)
                    // 'data_produk'   => $data_produk->get_produk(false,false,0),
                    // $data_shopbycategory->get_produk(75)
                );
                
                echo view('layout',$data);
            }
        
        }

    }
    
    public function beli()
    {
        helper(['form', 'url']);
        $type_user = session()->get('type_user');
        
        $request            = \Config\Services::request();
        $ip                 = $request->getIPAddress();
        $this->data_order   = new Order_Model();
        
        $cart       = \Config\Services::cart();
        $keranjang  = $cart->contents();
        
        $invoice_no = $this->request->getVar('invoice_no');
        
            $data = array(
                'store_id'          => $this->request->getVar('store_id'),
                'store_name'        => $this->request->getVar('store_name'),
                'order_status_id'   => '1',
                'invoice_no'        => $this->request->getVar('invoice_no'),
                'customer_id'       => $this->request->getVar('customer_id'),
                'comment'           => $this->request->getVar('comment'),
                'type_user'         => $type_user,
                // 'postcode'          => $this->request->getVar('postcode'),
                
                'customer_group_id' => $this->request->getVar('customer_group_id'),
                'firstname'         => $this->request->getVar('firstname'),
                'lastname'          => $this->request->getVar('lastname'),
                'email'             => $this->request->getVar('email'),
                'telephone'         => $this->request->getVar('telephone'),
                'hp_distributor'    => $this->request->getVar('hp_distributor'),
                
                'payment_firstname'     => $this->request->getVar('payment_firstname'),
                'payment_company'       => $this->request->getVar('payment_company'),
                'payment_address_1'     => $this->request->getVar('payment_address_1'),
                'payment_address_2'     => $this->request->getVar('payment_address_2'),
                'payment_postcode'      => $this->request->getVar('payment_postcode'),
                'payment_city'          => $this->request->getVar('payment_city'),
                'payment_zone'          => $this->request->getVar('payment_zone'),
                'payment_country'       => $this->request->getVar('payment_country'),
                'payment_city_id'       => $this->request->getVar('payment_city_id'),
                'payment_zone_id'       => $this->request->getVar('payment_zone_id'),
                'payment_country_id'    => $this->request->getVar('payment_country_id'),
                'payment_method'        => $this->request->getVar('payment_method'),
                
                'currency_value'        => $this->request->getVar('subtotal'),
                'angka_unik'            => $this->request->getVar('unik'),
                'currency_code'         => 'Rp.',
                'total'                 => $this->request->getVar('tot_qty'),
                'weight'                => $this->request->getVar('berat'),
            
                'shipping_firstname'     => $this->request->getVar('shipping_firstname'),
                'shipping_telephone'     => $this->request->getVar('shipping_telephone'),
                'shipping_company'       => $this->request->getVar('shipping_company'),
                'shipping_address_1'     => $this->request->getVar('shipping_address_1'),
                'shipping_address_2'     => $this->request->getVar('shipping_address_2'),
                'shipping_postcode'      => $this->request->getVar('shipping_postcode'),
                'shipping_city'          => $this->request->getVar('shipping_city'),
                'shipping_zone'          => $this->request->getVar('shipping_zone'),
                'shipping_country'       => $this->request->getVar('shipping_country'),
                'shipping_city_id'       => $this->request->getVar('shipping_city_id'),
                'shipping_zone_id'       => $this->request->getVar('shipping_zone_id'),
                'shipping_method'        => $this->request->getVar('shipping_method'),
                'shipping_cost'          => $this->request->getVar('ongkir'),
                'tariff_code'            => $this->request->getVar('tariff_code'),
                'code_origin'            => $this->request->getVar('code_origin'),
                'data_origin'            => $this->request->getVar('data_origin'),
                'date_added'             => date("Y-m-d"),
                'ip'                     => $ip,
                
            );


            // $order_id='';
             $order_id = $this->data_order->save_order($data,'mst');
             
             $invoice_no =$invoice_no.substr($order_id+10000000,3);
             $data = array (
                    'invoice_no'    => $invoice_no,
                    );
            
            $this->data_order->update_order($data,$order_id);
            
            //---- payment gateway midtrans ------
            $billing_address = array(
                'first_name'    => $this->request->getVar('payment_firstname'),
                'last_name'     => " ",
                'address'       => $this->request->getVar('payment_address_1').' '.$this->request->getVar('payment_address_2'),
                'city'          => $this->request->getVar('payment_city'),
                'postal_code'   => $this->request->getVar('payment_postcode'),
                'phone'         => " ",
                'country_code'  => $this->request->getVar('payment_country')
            );
            $shipping_address = array(
                'first_name'    => $this->request->getVar('shipping_firstname'),
                'last_name'     => " ",
                'address'       => $this->request->getVar('shipping_address_1').' '.$this->request->getVar('shipping_address_2'),
                'city'          => $this->request->getVar('shipping_city'),
                'postal_code'   => $this->request->getVar('shipping_postcode'),
                'phone'         => $this->request->getVar('shipping_telephone'),
                'country_code'  => $this->request->getVar('shipping_country')
            );
        	$customer_details = array(
        	    'firstname'     => $this->request->getVar('firstname'),
                'lastname'      => $this->request->getVar('lastname'),
                'email'         => $this->request->getVar('email'),
                'phone'         => $this->request->getVar('telephone'),
                'billing_address'  => $billing_address,
                'shipping_address' => $shipping_address
            );										
            $transaction_details = array(
                'order_id'      => $invoice_no,//.'-'.rand(10,99), //$order_id.$this->request->getVar('invoice_no'),
                'gross_amount'  => round($this->request->getVar('subtotal')+$this->request->getVar('ongkir')+$this->request->getVar('unik')), 
                // no decimal allowed for creditcard
            );
            
			$no  = 0;
            foreach ($keranjang as $key => $value) {
				$data_id= $value['id'];
                $akhir = strpos($data_id,"-");
                $id = substr($data_id,0,$akhir);
                
                $data = array(
                    'order_id'      => $order_id,
                    'product_id'    => $id,
                    'name'          => $value['name'],
                    'quantity'      => $value['qty'],
                    'price'         => $value['price'],
                    'total'         => $value['price']*$value['qty'],
                    'reward'        => $value['options']['reward'],
                    'model'         => $value['options']['name_option'],
                    'sku'           => $value['options']['sku'],
                );    
                $this->data_order->save_order($data,'dtl');
                
                //---- payment item product----
                $no ++;
    			${"item_details".$no} = array(
                    'id'    => $id,
                    'price' => round($value['price']),
                    'quantity' => $value['qty'],
                    'name'  => $value['name']
                );
                
            }   
            
            $no++;
			${"item_details".$no} = array(
                'id'    => 9998,
                'price' => $this->request->getVar('ongkir'),
                'quantity' => 1,
                'name'  => 'Ongkos Kirim '
            );
            
            $no++;
			${"item_details".$no} = array(
                'id'    => 9999,
                'price' => $this->request->getVar('unik'),
                'quantity' => 1,
                'name'  => 'Biaya Admin Transfer '
            );
            switch ($no) {
                case 1:
                    $item_details = array ($item_details1);
                    break;
                case 2:
                    $item_details = array ($item_details1,$item_details2);
                    break;
                case 3:
                    $item_details = array ($item_details1,$item_details2,$item_details3);
                    break;
                case 4:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4);
                    break;
                case 5:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5);
                    break;
                case 6:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6);
                    break;
                case 7:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7);
                    break;
                case 8:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8);
                    break;
                case 9:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9);
                    break;
                case 10:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                           ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10);
                    break;
                case 11:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11);
                    break;
                case 12:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12);
                    break;
                case 13:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12,$item_details13);
                    break;
                case 14:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12,$item_details13,$item_details14);
                    break;
                case 15:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12,$item_details13,$item_details14,$item_details15);
                    break;
                case 16:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12,$item_details13,$item_details14,$item_details15
                                          ,$item_details16);
                    break;
                default:
                    $item_details = array ($item_details1,$item_details2,$item_details3,$item_details4,$item_details5
                                          ,$item_details6,$item_details7,$item_details8,$item_details9,$item_details10
                                          ,$item_details11,$item_details12,$item_details13,$item_details14,$item_details15
                                          ,$item_details16,$item_details17);
            }
            
            // Optional, remove this to display all available payment methods
            $enable_payments = array('credit_card','cimb_clicks','mandiri_clickpay','echannel');
            //$enable_payments = array('credit_card','cimb_clicks','mandiri_clickpay');
                                    
            // Fill transaction details
            $transaction = array(
                // 'enabled_payments' => $enable_payments,
                'customer_details' => $customer_details,
                'item_details' => $item_details,
                'transaction_details' => $transaction_details,
            );
            
            //----- simpan history order -------
            $data = array(
                    'order_id'          => $order_id,
                    'order_status_id'   => '1',
                    'comment'           => $this->request->getVar('comment'),
                    'date_added'        => date("Y-m-d"),
                );    
                $this->data_order->save_order($data,'histori');
            
            
            

    //         session()->setFlashdata('message', 'Anda berhasil Menambahkan Alamat');
    //         return redirect()->to(base_url('ShopCart/beli_sukses'));

    // }
    
    // public function beli_sukses()
    // {
    //     helper(['form', 'url']);
    
        //--- Simpan Data mutasi Order ---
        
        $this->data_order->mutasi_stok($order_id);
        
        //--- EOF Simpan Data mutasi Order ---
        
        
        $customer_id=session()->get('customer_id');
        $cart = \Config\Services::cart();
        $cart->destroy();
        
        $agent = $this->request->getUserAgent();
		
		if ($agent->isMobile()) {
		    $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'transaction'   => $transaction,
                'order_id'      => $order_id,
                'componen'      => 'theme/mobile/halaman/beli',
                
                'client_key'        => $this->request->getVar('client_key'), 
        		'server_key'        => $this->request->getVar('server_key'), 
        		'merchant_id'       => $this->request->getVar('merchant_id'), 
        		'admin_fee'         => $this->request->getVar('admin_fee'),
        		'environment'       => $this->request->getVar('environment'),
        		'link_midtrans'     => $this->request->getVar('link_midtrans'), 
        		'status_midtrans'   => $this->request->getVar('status_midtrans'), 
            );
            
            echo view('layout_mobile',$data);
            
        } else {    
            $data = array(
    			'title'         => 'KanzaMALL - Toko Online Herbal Majakanza',
                'description'   => 'KanzaMall - Toko Online Obat Herbal, Kosmetik dan Fashion ',
                'keywords'      => 'toko Online, majakanza, herbal, fashion, jilbab, kosmestik, kanzamall',
                'author'        => 'SWALT',
                'page1'         => 'Shopping Cart',
                'transaction'   => $transaction,
                'order_id'      => $order_id,
                'componen'      => 'theme/kanza/halaman/beli',
                
                'client_key'        => $this->request->getVar('client_key'), 
        		'server_key'        => $this->request->getVar('server_key'), 
        		'merchant_id'       => $this->request->getVar('merchant_id'), 
        		'admin_fee'         => $this->request->getVar('admin_fee'),
        		'environment'       => $this->request->getVar('environment'),
        		'link_midtrans'     => $this->request->getVar('link_midtrans'), 
        		'status_midtrans'   => $this->request->getVar('status_midtrans'), 
            );
    
            echo view('layout',$data);
        }
        

    }

    
    public function cek_ongkir()
    {
        $request        = \Config\Services::request();
        
        $from   = $this->request->getVar('from');
        $thru   = $this->request->getVar('thru');
        $weight = $this->request->getVar('weight');
                
        $username   = 'KANZAMALL';
        $api_key    = '2c31e688003f34ecc8f801bf959eaaf8';
        $api_url    = 'http://apiv2.jne.co.id:10101/tracing/api/pricedev';
        
        // $username   = 'TESTAPI';
        // $api_key    = '25c898a9faea1a100859ecd9ef674548';
        // $api_url    = 'http://apiv2.jne.co.id:10102/tracing/api/pricedev';        
                
        $curl = curl_init();
        
        curl_setopt_array($curl, array(
          CURLOPT_URL => $api_url,
          CURLOPT_RETURNTRANSFER => true,
          CURLOPT_ENCODING => "",
          CURLOPT_MAXREDIRS => 10,
          CURLOPT_TIMEOUT => 30,
          CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
          CURLOPT_CUSTOMREQUEST => "POST",
          CURLOPT_POSTFIELDS => "username=".$username."&api_key=".$api_key."&from=".$from."&thru=".$thru."&weight=".$weight,
          CURLOPT_HTTPHEADER => array(
            "content-type: application/x-www-form-urlencoded"
          ),
        ));
        
        $response = curl_exec($curl);
        $err = curl_error($curl);
        
        curl_close($curl);
        
        if ($err) {
          echo "cURL Error #:" . $err;
        } else {    
          echo $response;
        }
        
        
            // 
        // } 
    }
    
    
    
    public function ambil_address()
    {
        // echo "HHHHH";
        $data_alamat    = new AddressModel();
        $customer_id    = session()->get('customer_id');

        if(isset($_POST['id'])){
            $address_id  = $_POST['id'];
       
            //$this->session->set('ses_negara_id',$negara_id);
                                
            $data    = $data_alamat->get_address($customer_id,$address_id)->getResult();
            echo json_encode($data);
        } 
    }

}
