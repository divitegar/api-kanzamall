<?php

namespace App\Models;

use CodeIgniter\Model;

class Order_Model extends Model
{
    protected $table = "sw_order";
    protected $primaryKey = "order_id";
     
 
    public function get_order($customer_id = false,$order_id = false)
    {
        $builder = $this->table('sw_order');
        $builder->select("sw_order.*,sw_order_status.name as status_name");
        // $builder->join('sw_order_product','sw_order.order_id = sw_order_product.order_id', 'left');
        $builder->join('sw_order_status','sw_order.order_status_id = sw_order_status.order_status_id', 'left');
        $builder->orderBy('sw_order.order_id','DESC');
        
        if($order_id == false) 
        {    
            if($customer_id == false) 
            {    
                $where = "";// "sw_order.status =1 and sw_order.trash=0";
            } else {
                $where = "sw_order.customer_id='".$customer_id."'";
            }    
        } else {
            $where = "sw_order.order_id='".$order_id."'";
        }
        
        return $builder->where($where)->get();
    }
    
    public function get_order_produk($order_id = false)
    {
        $builder = $this->table('sw_order_product');
        $builder->select("sw_order_product.*");
        // // $builder->join('sw_order_product','sw_order.order_id = sw_order_product.order_id', 'left');
        
        if($order_id == false) 
        {    
                
            $where = "";// "sw_order.status =1 and sw_order.trash=0";
                
        } else {
            $where = "sw_order_product.order_id=".$order_id;
        }
        
        return $builder->where($where)->get();
    }
    
    public function save_order($data,$jenis)
    {
        $query='';
        
        if($jenis == "mst")
        {
            $this->db->table('sw_order')->insert($data);
            $query  = $this->db->insertid();
        }
        
        if($jenis == "dtl")
        {
            $query  = $this->db->table('sw_order_product')->insert($data);
        }
        
        if($jenis == "histori")
        {
            $query  =$this->db->table('sw_order_history')->insert($data);
        }
        
        
        return $query;
    }
    
    public function update_order($data,$order_id = false)
    {
        $query = $this->db->table('sw_order')->update($data, array('order_id' => $order_id));
        return $query;
    }
    
    public function update_order_histori($data,$order_id = false)
    {
        $query = $this->db->table('sw_order_history')->update($data, array('order_id' => $order_id));
        return $query;
    }
    
    public function save_test($data)
    {
        $query='';
        
            $this->db->table('sw_test')->insert($data);
            $query  = $this->db->insertid();
        
        
        
        return $query;
    }
    
    
    public function mutasi_stok($order_id = false)
    {
        
        $db = \Config\Database::connect();
        
        $query =$db->query("Select sw_order.store_id,sw_order_product.product_id,sw_order_product.quantity 
                                from sw_order_product 
                                LEFT JOIN sw_order ON sw_order.order_id = sw_order_product.order_id
                            where sw_order_product.order_id=".$order_id) ;
                
        foreach ($query->getResult() as $row)
        {
            $store_id      = $row->store_id;
            $product_id    = $row->product_id;
            $mutasi        = $row->quantity;
                
            $builder =$db->query("Select sw_product_to_store_dtl.* from sw_product_to_store_dtl
                                      WHERE sw_product_to_store_dtl.store_id=".$store_id." and sw_product_to_store_dtl.product_id=".$product_id.
                                 "      and sw_product_to_store_dtl.sisa>0 
                                    ORDER BY sw_product_to_store_dtl.store_id,sw_product_to_store_dtl.product_id,sw_product_to_store_dtl.product_to_store_dtl_id ASC") ;
                
            foreach ($builder->getResult() as $row1)
            {
                if($mutasi>0) {
                    $product_to_store_dtl_id = $row1->product_to_store_dtl_id;
                    if($row1->sisa > 0 ) {
                        if($row1->sisa-$mutasi > 0) {
                            $sisa    = $row1->sisa-$mutasi ;
                            $mutasi1 = $mutasi;
                            $mutasi  = 0;
                        } else {
                            $sisa = 0 ;
                            $mutasi  = $mutasi - $row1->sisa ;
                            $mutasi1 = $row1->sisa;
                        }              
                    
                        $mutasi1 = $row1->mutasi+$mutasi1;
                        $data = array(             
                            'mutasi'        => $mutasi1,
                            'sisa'          => $sisa,
                        );
                                
                        // $this->data_order->savemutasiorder($data,$product_to_store_dtl_id);
                        // $query = 
                        $this->db->table('sw_product_to_store_dtl')->update($data, array('product_to_store_dtl_id' => $product_to_store_dtl_id));
                    }
                }
            // return $query;
            }
                    
        }
                
    }
 
}
